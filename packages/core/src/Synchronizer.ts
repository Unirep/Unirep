import { EventEmitter } from 'events'
import { DB, TransactionDB } from 'anondb'
import { ethers } from 'ethers'
import { Prover } from '@unirep/circuits'
import { F, IncrementalMerkleTree } from '@unirep/utils'
import UNIREP_ABI from '@unirep/contracts/abi/Unirep.json'
import { schema } from './schema'
import { nanoid } from 'nanoid'
// TODO: consolidate these into 'anondb' index
import { constructSchema } from 'anondb/types'
import { MemoryConnector } from 'anondb/web'
import AsyncLock from 'async-lock'

type EventHandlerArgs = {
    event: ethers.Event
    decodedData: { [key: string]: any }
    db: TransactionDB
}

type AttesterSetting = {
    startTimestamp: number
    epochLength: number
}

export function toDecString(content: bigint | string) {
    return BigInt(content).toString()
}

/**
 * The synchronizer is used to construct the Unirep state. After events are emitted from the Unirep contract,
 * the synchronizer will verify the events and then save the states.
 */
export class Synchronizer extends EventEmitter {
    public _db: DB
    prover: Prover
    provider: any
    unirepContract: ethers.Contract
    private _attesterId: bigint[] = []
    public settings: any
    private _attesterSettings: { [key: string]: AttesterSetting } = {}
    protected defaultStateTreeLeaf: bigint = BigInt(0)
    protected defaultEpochTreeLeaf: bigint = BigInt(0)
    private _syncAll = false

    private _eventHandlers: any
    private _eventFilters: any

    private pollId: string | null = null
    public pollRate: number = 5000
    public blockRate: number = 100000

    private setupComplete = false

    private lock = new AsyncLock()

    /**
     * Maybe we can default the DB argument to an in memory implementation so
     * that downstream packages don't have to worry about it unless they want
     * to persist things?
     **/
    constructor(config: {
        db?: DB
        attesterId?: bigint | bigint[]
        prover: Prover
        provider: ethers.providers.Provider
        unirepAddress: string
    }) {
        super()
        const { db, prover, unirepAddress, provider, attesterId } = config

        if (Array.isArray(attesterId)) {
            // multiple attesters
            this._attesterId = attesterId.map((a) => BigInt(a))
        } else if (!!attesterId) {
            // single attester
            this._attesterId = [BigInt(attesterId)]
        } else if (!attesterId) {
            this._syncAll = true
        }

        this._db = db ?? new MemoryConnector(constructSchema(schema))
        this.unirepContract = new ethers.Contract(
            unirepAddress,
            UNIREP_ABI,
            provider
        )
        this.provider = provider
        this.prover = prover
        this.settings = {
            stateTreeDepth: 0,
            epochTreeDepth: 0,
            numEpochKeyNoncePerEpoch: 0,
            epochLength: 0,
            fieldCount: 0,
            sumFieldCount: 0,
        }
        const allEventNames = {} as any

        this._eventHandlers = Object.keys(this.contracts).reduce(
            (acc, address) => {
                // build _eventHandlers and decodeData functions
                const { contract, eventNames } = this.contracts[address]
                const handlers = {}
                for (const name of eventNames) {
                    if (allEventNames[name]) {
                        throw new Error(
                            `duplicate event name registered "${name}"`
                        )
                    }
                    allEventNames[name] = true
                    const topic = (contract.filters[name] as any)().topics[0]
                    const handlerName = `handle${name}`
                    if (typeof this[handlerName] !== 'function') {
                        throw new Error(
                            `No handler for event ${name} expected property "${handlerName}" to exist and be a function`
                        )
                    }
                    // set this up here to avoid re-binding on every call
                    const handler = this[`handle${name}`].bind(this)
                    handlers[topic] = ({ event, ...args }: any) => {
                        const decodedData = contract.interface.decodeEventLog(
                            name,
                            event.data,
                            event.topics
                        )
                        // call the handler with the event and decodedData
                        return handler({ decodedData, event, ...args })
                            .then((r) => {
                                if (r) {
                                    this.emit(name, { decodedData, event })
                                }
                                return r
                            })
                            .catch((err) => {
                                console.log(`${name} handler error`)
                                throw err
                            })
                        // uncomment this to debug
                        // console.log(name, decodedData)
                    }
                }
                return {
                    ...acc,
                    ...handlers,
                }
            },
            {}
        )
        this._eventFilters = Object.keys(this.contracts).reduce(
            (acc, address) => {
                const { contract, eventNames } = this.contracts[address]
                const filter = {
                    address,
                    topics: [
                        // don't spread here, it should be a nested array
                        eventNames.map(
                            (name) =>
                                (contract.filters[name] as any)().topics[0]
                        ),
                    ],
                }
                return {
                    ...acc,
                    [address]: filter,
                }
            },
            {}
        )
        this.setup().then(() => (this.setupComplete = true))
    }

    get attesterId() {
        if (this._attesterId.length === 0) return BigInt(0)
        return this._attesterId[0]
    }

    get attestersOrClauses() {
        const orClauses = [] as any[]
        for (let id = 0; id < this._attesterId.length; id++) {
            orClauses.push({
                attesterId: toDecString(this._attesterId[id]),
            })
        }
        return orClauses
    }

    setAttesterId(attesterId: string | bigint) {
        const index = this._attesterId.indexOf(BigInt(attesterId))
        if (index === -1) {
            throw new Error(
                `@unirep/core:Synchronizer: attester ID ${attesterId.toString()} is not synchronized`
            )
        }
        ;[this._attesterId[0], this._attesterId[index]] = [
            this._attesterId[index],
            this._attesterId[0],
        ]
    }

    attesterExist(attesterId: string | bigint) {
        return this._attesterId.indexOf(BigInt(attesterId)) !== -1
    }

    checkAttesterId(attesterId: string | bigint) {
        if (this._attesterId.length === 0) {
            throw new Error(
                `@unirep/core:Synchronizer: no attester ID is synchronized`
            )
        }
        if (!this.attesterExist(attesterId)) {
            throw new Error(
                `@unirep/core:Synchronizer: attester ID ${attesterId.toString()} is not synchronized`
            )
        }
    }

    async setup() {
        if (this.setupComplete) return
        const config = await this.unirepContract.config()
        this.settings.stateTreeDepth = config.stateTreeDepth
        this.settings.epochTreeDepth = config.epochTreeDepth
        this.settings.numEpochKeyNoncePerEpoch = config.numEpochKeyNoncePerEpoch
        this.settings.fieldCount = config.fieldCount
        this.settings.sumFieldCount = config.sumFieldCount

        await this._findStartBlock()
        this.setupComplete = true
    }

    private async _findStartBlock() {
        // look for the first attesterSignUp event
        // no events could be emitted before this
        const filter = this.unirepContract.filters.AttesterSignedUp()

        if (!this._syncAll && this._attesterId.length) {
            filter.topics?.push([
                ...this._attesterId.map(
                    (n) => '0x' + n.toString(16).padStart(64, '0')
                ),
            ])
        }
        const events = await this.unirepContract.queryFilter(filter)
        if (events.length === 0) {
            throw new Error(
                `@unirep/core:Synchronizer: failed to fetch genesis event`
            )
        }

        const docs: any[] = []
        for (let event of events) {
            const decodedData = this.unirepContract.interface.decodeEventLog(
                'AttesterSignedUp',
                event.data,
                event.topics
            )
            const { timestamp, epochLength, attesterId } = decodedData
            this._attesterSettings[toDecString(attesterId)] = {
                startTimestamp: Number(timestamp),
                epochLength: Number(epochLength),
            }
            if (
                this._syncAll &&
                !this.attesterExist(attesterId) &&
                BigInt(attesterId) !== BigInt(0)
            ) {
                this._attesterId.push(BigInt(attesterId))
            }
            const syncStartBlock = event.blockNumber - 1

            const findDoc = await this._db.findOne('SynchronizerState', {
                where: {
                    attesterId: toDecString(attesterId),
                },
            })
            if (!findDoc) {
                docs.push({
                    attesterId: toDecString(attesterId),
                    latestCompleteBlock: syncStartBlock,
                })
            }
        }

        await this._db.create('SynchronizerState', docs)
    }

    /**
     * Start polling the blockchain for new events. If we're behind the HEAD
     * block we'll poll many times quickly
     */
    async start() {
        await this.setup()
        ;(async () => {
            const pollId = nanoid()
            this.pollId = pollId
            const minBackoff = 128
            let backoff = minBackoff
            for (;;) {
                // poll repeatedly until we're up to date
                try {
                    const { complete } = await this.poll()
                    if (complete) break
                    backoff = Math.max(backoff / 2, minBackoff)
                } catch (err) {
                    backoff *= 2
                    console.error(`--- unirep poll failed`)
                    console.error(err)
                    console.error(`---`)
                }
                await new Promise((r) => setTimeout(r, backoff))
                if (pollId != this.pollId) break
            }
            for (;;) {
                await new Promise((r) => setTimeout(r, this.pollRate))
                if (pollId != this.pollId) break
                await this.poll().catch((err) => {
                    console.error(`--- unirep poll failed`)
                    console.error(err)
                    console.error(`---`)
                })
            }
        })()
    }

    /**
     * Stop synchronizing with Unirep contract.
     */
    stop() {
        this.pollId = null
    }

    // Poll for any new changes from the blockchain
    async poll(): Promise<{ complete: boolean }> {
        return this.lock.acquire('poll', () => this._poll())
    }

    private async _poll(): Promise<{ complete: boolean }> {
        if (!this.setupComplete) {
            console.warn(
                '@unirep/core:Synchronizer: polled before setup, nooping'
            )
            return { complete: false }
        }
        this.emit('pollStart')

        const state = await this._db.findOne('SynchronizerState', {
            where: {
                OR: this.attestersOrClauses,
            },
            orderBy: {
                latestCompleteBlock: 'asc',
            },
        })
        const latestProcessed = state.latestCompleteBlock
        const latestBlock = await this.provider.getBlockNumber()
        const blockStart = latestProcessed + 1
        const blockEnd = Math.min(+latestBlock, blockStart + this.blockRate)

        const newEvents = await this.loadNewEvents(
            latestProcessed + 1,
            blockEnd
        )

        // filter out the events that have already been seen
        const unprocessedEvents = newEvents.filter((e) => {
            if (e.blockNumber === state.latestProcessedBlock) {
                if (
                    e.transactionIndex === state.latestProcessedTransactionIndex
                ) {
                    return e.logIndex > state.latestProcessedEventIndex
                }
                return (
                    e.transactionIndex > state.latestProcessedTransactionIndex
                )
            }
            return e.blockNumber > state.latestProcessedBlock
        })
        await this.processEvents(unprocessedEvents)
        await this._db.update('SynchronizerState', {
            where: {
                OR: this.attestersOrClauses,
            },
            update: {
                latestCompleteBlock: blockEnd,
            },
        })

        return {
            complete: latestBlock === blockEnd,
        }
    }

    // Overridden in subclasses
    async loadNewEvents(fromBlock: number, toBlock: number) {
        const promises = [] as any[]
        for (const address of Object.keys(this.contracts)) {
            const { contract } = this.contracts[address]
            const filter = this._eventFilters[address]
            promises.push(contract.queryFilter(filter, fromBlock, toBlock))
        }
        return (await Promise.all(promises)).flat()
    }

    // override this and only this
    get contracts() {
        return {
            [this.unirepContract.address]: {
                contract: this.unirepContract,
                eventNames: [
                    'UserSignedUp',
                    'UserStateTransitioned',
                    'Attestation',
                    'EpochEnded',
                    'StateTreeLeaf',
                    'EpochTreeLeaf',
                    'AttesterSignedUp',
                ],
            },
        }
    }

    private async processEvents(events: ethers.Event[]) {
        if (events.length === 0) return
        events.sort((a: any, b: any) => {
            if (a.blockNumber !== b.blockNumber) {
                return a.blockNumber - b.blockNumber
            }
            if (a.transactionIndex !== b.transactionIndex) {
                return a.transactionIndex - b.transactionIndex
            }
            return a.logIndex - b.logIndex
        })

        for (const event of events) {
            try {
                let success: boolean | undefined
                await this._db.transaction(async (db) => {
                    const handler = this._eventHandlers[event.topics[0]]
                    if (!handler) {
                        throw new Error(
                            `@unirep/core:Synchronizer: Unrecognized event topic "${event.topics[0]}"`
                        )
                    }
                    success = await handler({
                        event,
                        db,
                    })
                    db.update('SynchronizerState', {
                        where: {
                            OR: this.attestersOrClauses,
                        },
                        update: {
                            latestProcessedBlock: +event.blockNumber,
                            latestProcessedTransactionIndex:
                                +event.transactionIndex,
                            latestProcessedEventIndex: +event.logIndex,
                        },
                    })
                })
                if (success) this.emit(event.topics[0], event)
                this.emit('processedEvent', event)
            } catch (err) {
                console.log(
                    `@unirep/core:Synchronizer: Error processing event:`,
                    err
                )
                console.log(event)
                throw err
            }
        }
    }

    /**
     * Wait the synchronizer to process the events until the latest block.
     */
    async waitForSync(blockNumber?: number) {
        const latestBlock =
            blockNumber ?? (await this.unirepContract.provider.getBlockNumber())
        for (;;) {
            const state = await this._db.findOne('SynchronizerState', {
                where: {
                    OR: this.attestersOrClauses,
                },
                orderBy: {
                    latestCompleteBlock: 'asc',
                },
            })
            if (state && state.latestCompleteBlock >= latestBlock) return
            await new Promise((r) => setTimeout(r, 250))
        }
    }

    async readCurrentEpoch(attesterId: bigint | string = this.attesterId) {
        const currentEpoch = await this._db.findOne('Epoch', {
            where: {
                attesterId: attesterId.toString(),
            },
            orderBy: {
                number: 'desc',
            },
        })
        return (
            currentEpoch || {
                number: 0,
                sealed: false,
            }
        )
    }

    calcCurrentEpoch(attesterId: bigint | string = this.attesterId) {
        this.checkAttesterId(attesterId)
        const decAttesterId = toDecString(attesterId)
        const timestamp = Math.floor(+new Date() / 1000)
        const { startTimestamp, epochLength } =
            this._attesterSettings[decAttesterId]
        return Math.max(
            0,
            Math.floor((timestamp - startTimestamp) / epochLength)
        )
    }

    calcEpochRemainingTime(attesterId: bigint | string = this.attesterId) {
        const timestamp = Math.floor(+new Date() / 1000)
        const currentEpoch = this.calcCurrentEpoch(attesterId)
        const decAttesterId = toDecString(attesterId)
        const { startTimestamp, epochLength } =
            this._attesterSettings[decAttesterId]
        const epochEnd = startTimestamp + (currentEpoch + 1) * epochLength
        return Math.max(0, epochEnd - timestamp)
    }

    async loadCurrentEpoch(attesterId: bigint | string = this.attesterId) {
        const epoch = await this.unirepContract.attesterCurrentEpoch(attesterId)
        return epoch.toNumber()
    }

    async epochTreeRoot(
        epoch: number,
        attesterId: bigint | string = this.attesterId
    ) {
        return this.unirepContract.attesterEpochRoot(attesterId, epoch)
    }

    async epochTreeProof(
        epoch: number,
        leafIndex: any,
        attesterId: bigint | string = this.attesterId
    ) {
        const tree = await this.genEpochTree(epoch, attesterId)
        const proof = tree.createProof(leafIndex)
        return proof
    }

    async nullifierExist(nullifier: any) {
        const epochEmitted = await this.unirepContract.usedNullifiers(nullifier)
        return epochEmitted.gt(0)
    }

    async genStateTree(
        _epoch: number | ethers.BigNumberish,
        attesterId: bigint | string = this.attesterId
    ): Promise<IncrementalMerkleTree> {
        this.checkAttesterId(attesterId)
        const epoch = Number(_epoch)
        const tree = new IncrementalMerkleTree(
            this.settings.stateTreeDepth,
            this.defaultStateTreeLeaf
        )
        const leaves = await this._db.findMany('StateTreeLeaf', {
            where: {
                epoch: Number(epoch),
                attesterId: toDecString(attesterId),
            },
        })
        for (const leaf of leaves) {
            tree.insert(leaf.hash)
        }
        return tree
    }

    async genEpochTree(
        _epoch: number | ethers.BigNumberish,
        attesterId: bigint | string = this.attesterId
    ): Promise<IncrementalMerkleTree> {
        this.checkAttesterId(attesterId)
        const epoch = Number(_epoch)
        const tree = new IncrementalMerkleTree(this.settings.epochTreeDepth, this.defaultEpochTreeLeaf)
        const leaves = await this._db.findMany('EpochTreeLeaf', {
            where: {
                epoch,
                attesterId: toDecString(attesterId),
            },
            orderBy: {
                index: 'asc',
            },
        })
        if (leaves.length === 0) tree.insert(0)
        for (const { hash } of leaves) {
            tree.insert(hash)
        }
        return tree
    }

    /**
     * Check if the global state tree root is stored in the database
     * @param root The queried global state tree root
     * @param epoch The queried epoch of the global state tree
     * @returns True if the global state tree root exists, false otherwise.
     */
    async stateTreeRootExists(
        root: bigint | string,
        epoch: number,
        attesterId: bigint | string = this.attesterId
    ) {
        return this.unirepContract.attesterStateTreeRootExists(
            attesterId,
            epoch,
            root
        )
    }

    /**
     * Check if the epoch tree root is stored in the database.
     * @param _epochTreeRoot The queried epoch tree root
     * @param epoch The queried epoch of the epoch tree
     * @returns True if the epoch tree root is in the database, false otherwise.
     */
    async epochTreeRootExists(
        _epochTreeRoot: bigint | string,
        epoch: number
    ): Promise<boolean> {
        const root = await this.unirepContract.epochRoots(epoch)
        return root.toString() === _epochTreeRoot.toString()
    }

    /**
     * Get the number of global state tree leaves in a given epoch.
     * @param epoch The epoch query
     * @returns The number of the global state tree leaves
     */
    async numStateTreeLeaves(
        epoch: number,
        attesterId: bigint | string = this.attesterId
    ) {
        this.checkAttesterId(attesterId)
        return this._db.count('StateTreeLeaf', {
            epoch: epoch,
            attesterId: toDecString(attesterId),
        })
    }

    // unirep event handlers

    async handleStateTreeLeaf({ event, db, decodedData }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const index = Number(decodedData.index)
        const attesterId = toDecString(decodedData.attesterId)
        const hash = toDecString(decodedData.leaf)
        if (!this.attesterExist(attesterId)) return
        db.create('StateTreeLeaf', {
            epoch,
            hash,
            index,
            attesterId,
            blockNumber: event.blockNumber,
        })
        return true
    }

    async handleEpochTreeLeaf({ event, db, decodedData }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const index = toDecString(decodedData.index)
        const attesterId = toDecString(decodedData.attesterId)
        const hash = toDecString(decodedData.leaf)
        const { blockNumber } = event
        if (!this.attesterExist(attesterId)) return
        const id = `${epoch}-${index}-${attesterId}`
        db.upsert('EpochTreeLeaf', {
            where: {
                id,
            },
            update: {
                hash,
                blockNumber,
            },
            create: {
                id,
                epoch,
                index,
                attesterId,
                hash,
                blockNumber,
            },
        })
        return true
    }

    async handleUserSignedUp({ decodedData, event, db }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const commitment = toDecString(decodedData.identityCommitment)
        const attesterId = toDecString(decodedData.attesterId)
        const leafIndex = toDecString(decodedData.leafIndex)
        const { blockNumber } = event
        if (!this.attesterExist(attesterId)) return
        db.create('UserSignUp', {
            commitment,
            epoch,
            attesterId,
            blockNumber,
        })
        return true
    }

    async handleAttestation({ decodedData, event, db }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const epochKey = toDecString(decodedData.epochKey)
        const attesterId = toDecString(decodedData.attesterId)
        const fieldIndex = Number(decodedData.fieldIndex)
        const change = toDecString(decodedData.change)
        const timestamp = Number(decodedData.timestamp)
        const { blockNumber } = event
        if (!this.attesterExist(attesterId)) return

        const index = `${event.blockNumber
            .toString()
            .padStart(15, '0')}${event.transactionIndex
            .toString()
            .padStart(8, '0')}${event.logIndex.toString().padStart(8, '0')}`

        const currentEpoch = await this.readCurrentEpoch(attesterId)
        if (epoch !== Number(currentEpoch.number)) {
            throw new Error(
                `Synchronizer: Epoch (${epoch}) must be the same as the current synced epoch ${currentEpoch.number}`
            )
        }

        db.create('Attestation', {
            epoch,
            epochKey,
            index,
            attesterId,
            fieldIndex,
            change,
            timestamp,
            blockNumber,
        })
        const findEpoch = await this._db.findOne('Epoch', {
            where: {
                attesterId,
                number: epoch,
            },
        })
        if (!findEpoch) {
            db.create('Epoch', {
                number: epoch,
                attesterId,
                sealed: false,
            })
        }
        return true
    }

    async handleUserStateTransitioned({
        decodedData,
        event,
        db,
    }: EventHandlerArgs) {
        const transactionHash = event.transactionHash
        const epoch = Number(decodedData.epoch)
        const attesterId = toDecString(decodedData.attesterId)
        const nullifier = toDecString(decodedData.nullifier)
        const { blockNumber } = event
        if (!this.attesterExist(attesterId)) return

        db.create('Nullifier', {
            epoch,
            attesterId,
            nullifier,
            transactionHash,
            blockNumber,
        })

        return true
    }

    async handleEpochEnded({ decodedData, event, db }: EventHandlerArgs) {
        const number = Number(decodedData.epoch)
        const attesterId = toDecString(decodedData.attesterId)
        console.log(`Epoch ${number} ended`)
        if (!this.attesterExist(attesterId)) return
        const existingDoc = await this._db.findOne('Epoch', {
            where: {
                number,
                attesterId,
            },
        })
        const sealed = true
        if (existingDoc) {
            db.update('Epoch', {
                where: {
                    number,
                    attesterId,
                },
                update: {
                    sealed,
                },
            })
        } else {
            db.create('Epoch', {
                number,
                attesterId,
                sealed,
            })
        }
        // create the next stub entry
        db.create('Epoch', {
            number: number + 1,
            attesterId,
            sealed,
        })
        return true
    }

    async handleAttesterSignedUp({ decodedData, event, db }: EventHandlerArgs) {
        const _id = toDecString(decodedData.attesterId)
        const epochLength = Number(decodedData.epochLength)
        const startTimestamp = Number(decodedData.timestamp)

        if (this._syncAll && !this.attesterExist(_id) && _id !== '0') {
            this._attesterSettings[_id] = {
                startTimestamp,
                epochLength,
            }
            this._attesterId.push(BigInt(_id))
            db.create('SynchronizerState', {
                attesterId: _id,
                latestCompleteBlock: event.blockNumber - 1,
            })
        }
        if (!this.attesterExist(_id)) return

        db.upsert('Attester', {
            where: {
                _id,
            },
            create: {
                _id,
                epochLength,
                startTimestamp,
            },
            update: {},
        })
        return true
    }
}
