import { EventEmitter } from 'events'
import { DB, TransactionDB } from 'anondb'
import { ethers } from 'ethers'
import { Prover, SNARK_SCALAR_FIELD } from '@unirep/circuits'
import { IncrementalMerkleTree, hash4 } from '@unirep/utils'
import UNIREP_ABI from '@unirep/contracts/abi/Unirep.json'
import { schema } from './schema'
import { nanoid } from 'nanoid'
// TODO: consolidate these into 'anondb' index
import { constructSchema } from 'anondb/types'
import { MemoryConnector } from 'anondb/web'

type EventHandlerArgs = {
    event: ethers.Event
    decodedData: { [key: string]: any }
    db: TransactionDB
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
    private _attesterId: bigint
    public settings: any
    // state tree for current epoch
    private stateTree?: IncrementalMerkleTree
    protected defaultStateTreeLeaf?: bigint
    protected defaultEpochTreeLeaf = hash4([0, 0, 0, 0])

    private _eventHandlers: any
    private _eventFilters: any

    private pollId: string | null = null
    public pollRate: number = 5000

    private setupComplete = false

    private get _stateTree() {
        if (!this.stateTree) {
            throw new Error('Synchronizer: in memory tree not initialized')
        }
        return this.stateTree
    }

    /**
     * Maybe we can default the DB argument to an in memory implementation so
     * that downstream packages don't have to worry about it unless they want
     * to persist things?
     **/
    constructor(config: {
        db?: DB
        attesterId?: bigint
        prover: Prover
        provider: ethers.providers.Provider
        unirepAddress: string
    }) {
        super()
        const { db, prover, unirepAddress, provider, attesterId } = config

        this._attesterId = BigInt(attesterId ?? 1)
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
            epochTreeArity: 2,
            numEpochKeyNoncePerEpoch: 0,
            epochLength: 0,
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
                        return handler({ decodedData, event, ...args }).catch(
                            (err) => {
                                console.log(`${name} handler error`)
                                throw err
                            }
                        )
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
        return this._attesterId
    }

    async setup() {
        const config = await this.unirepContract.config()
        this.settings.stateTreeDepth = config.stateTreeDepth
        this.settings.epochTreeDepth = config.epochTreeDepth
        this.settings.epochTreeArity = config.epochTreeArity
        this.settings.numEpochKeyNoncePerEpoch =
            config.numEpochKeyNoncePerEpoch.toNumber()

        await this.findStartBlock()

        this.settings.epochLength = (
            await this.unirepContract.attesterEpochLength(this.attesterId)
        ).toNumber()
        this.settings.startTimestamp = (
            await this.unirepContract.attesterStartTimestamp(this.attesterId)
        ).toNumber()
        // load the GST for the current epoch
        // assume we're resuming a sync using the same database
        const epochs = await this._db.findMany('Epoch', {
            where: {
                attesterId: this.attesterId.toString(),
                sealed: false,
            },
        })
        this.defaultStateTreeLeaf = BigInt(0)
        this.stateTree = new IncrementalMerkleTree(
            this.settings.stateTreeDepth,
            this.defaultStateTreeLeaf
        )
        // if it's a new sync, start with epoch 0
        const epoch = epochs[epochs.length - 1]?.number ?? 0
        // otherwise load the leaves and insert them
        // TODO: index consistency verification, ensure that indexes are
        // sequential and no entries are skipped, e.g. 1,2,3,5,6,7
        const leaves = await this._db.findMany('StateTreeLeaf', {
            where: {
                epoch,
                attesterId: this.attesterId.toString(),
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const leaf of leaves) {
            this._stateTree.insert(leaf.hash)
        }
    }

    async findStartBlock() {
        // look for the first attesterSignUp event
        // no events could be emitted before this
        const filter = this.unirepContract.filters.AttesterSignedUp(
            this.attesterId
        )
        const events = await this.unirepContract.queryFilter(filter)
        if (events.length === 0) {
            throw new Error('failed to fetch genesis event')
        }
        if (events.length > 1) {
            throw new Error('multiple genesis events')
        }
        const [event] = events
        const decodedData = this.unirepContract.interface.decodeEventLog(
            'AttesterSignedUp',
            event.data,
            event.topics
        )
        const { timestamp, epochLength } = decodedData
        this.settings.startTimestamp = Number(timestamp)
        this.settings.epochLength = Number(epochLength)
        const syncStartBlock = event.blockNumber - 1

        await this._db.upsert('SynchronizerState', {
            where: {
                attesterId: this.attesterId.toString(),
            },
            create: {
                attesterId: this.attesterId.toString(),
                latestCompleteBlock: syncStartBlock,
            },
            update: {},
        })
    }

    /**
     * Start synchronize the events with Unirep contract util a `stop()` is called.
     * The synchronizer will check the database first to check if
     * there is some states stored in database
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
    async stop() {
        this.pollId = null
    }

    // Poll for any new changes from the blockchain
    // need a lock for this
    async poll(): Promise<{ complete: boolean }> {
        if (!this.setupComplete) {
            console.warn('polled before setup, nooping')
            return { complete: false }
        }
        this.emit('pollStart')
        const state = await this._db.findOne('SynchronizerState', {
            where: {
                attesterId: this.attesterId.toString(),
            },
        })

        const latestProcessed = state.latestCompleteBlock
        const latestBlock = await this.provider.getBlockNumber()
        const blockStart = latestProcessed + 1
        const blockEnd = Math.min(+latestBlock, blockStart + 1000)

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
                attesterId: this.attesterId.toString(),
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
                    'AttestationSubmitted',
                    'EpochEnded',
                    'StateTreeLeaf',
                    'EpochTreeLeaf',
                ],
            },
        }
    }

    async processEvents(events: ethers.Event[]) {
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
                            `Unrecognized event topic "${event.topics[0]}"`
                        )
                    }
                    success = await handler({ event, db })
                    db.update('SynchronizerState', {
                        where: {
                            attesterId: this.attesterId.toString(),
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
                console.log(`Error processing event:`, err)
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
                    attesterId: this.attesterId.toString(),
                },
            })
            if (state && state.latestCompleteBlock >= latestBlock) return
            await new Promise((r) => setTimeout(r, 250))
        }
    }

    async readCurrentEpoch() {
        const currentEpoch = await this._db.findOne('Epoch', {
            where: {
                attesterId: this.attesterId.toString(),
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

    calcCurrentEpoch() {
        const timestamp = Math.floor(+new Date() / 1000)
        return Math.max(
            0,
            Math.floor(
                (timestamp - this.settings.startTimestamp) /
                    this.settings.epochLength
            )
        )
    }

    calcEpochRemainingTime() {
        const timestamp = Math.floor(+new Date() / 1000)
        const currentEpoch = this.calcCurrentEpoch()
        const epochEnd =
            this.settings.startTimestamp +
            (currentEpoch + 1) * this.settings.epochLength
        return Math.max(0, epochEnd - timestamp)
    }

    async loadCurrentEpoch() {
        const epoch = await this.unirepContract.attesterCurrentEpoch(
            this.attesterId
        )
        return BigInt(epoch.toString())
    }

    async isEpochSealed(epoch: number) {
        const sealed = await this.unirepContract.attesterEpochSealed(
            this.attesterId,
            epoch
        )
        return sealed
    }

    async epochTreeRoot(epoch: number) {
        return this.unirepContract.attesterEpochRoot(this.attesterId, epoch)
    }

    async epochTreeProof(epoch: number, leafIndex: any) {
        const tree = await this.genEpochTree(epoch)
        const proof = tree.createProof(leafIndex)
        return proof
    }

    async nullifierExist(nullifier: any) {
        const epochEmitted = await this.unirepContract.usedNullifiers(nullifier)
        return epochEmitted.gt(0)
    }

    async genStateTree(
        _epoch: number | ethers.BigNumberish
    ): Promise<IncrementalMerkleTree> {
        const epoch = Number(_epoch)
        const tree = new IncrementalMerkleTree(
            this.settings.stateTreeDepth,
            this.defaultStateTreeLeaf
        )
        const leaves = await this._db.findMany('StateTreeLeaf', {
            where: {
                epoch: Number(epoch),
                attesterId: this.attesterId.toString(),
            },
        })
        for (const leaf of leaves) {
            tree.insert(leaf.hash)
        }
        return tree
    }

    async genEpochTree(
        _epoch: number | ethers.BigNumberish
    ): Promise<IncrementalMerkleTree> {
        const epoch = Number(_epoch)
        const tree = new IncrementalMerkleTree(
            this.settings.epochTreeDepth,
            0,
            this.settings.epochTreeArity
        )
        const leaves = await this._db.findMany('EpochTreeLeaf', {
            where: {
                epoch,
                attesterId: this.attesterId.toString(),
            },
        })
        const leafInts = leaves
            .map(({ hash }) => BigInt(hash))
            .sort((a, b) => (a > b ? 1 : -1))
        // Epoch trees always start with a 0 leaf
        tree.insert(0)
        for (const hash of leafInts) {
            tree.insert(hash)
        }
        tree.insert(BigInt(SNARK_SCALAR_FIELD) - BigInt(1))
        return tree
    }

    async genEpochTreePreimages(
        _epoch: number | ethers.BigNumberish
    ): Promise<any[]> {
        const epoch = Number(_epoch)
        const leaves = await this._db.findMany('EpochTreeLeaf', {
            where: {
                epoch,
                attesterId: this.attesterId.toString(),
            },
            orderBy: {
                index: 'asc',
            },
        })
        return leaves.map(
            ({ epochKey, posRep, negRep, graffiti, timestamp }) => [
                epochKey,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ]
        )
    }

    /**
     * Check if the global state tree root is stored in the database
     * @param root The queried global state tree root
     * @param epoch The queried epoch of the global state tree
     * @returns True if the global state tree root exists, false otherwise.
     */
    async stateTreeRootExists(root: bigint | string, epoch: number) {
        return this.unirepContract.attesterStateTreeRootExists(
            this.attesterId,
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
    async numStateTreeLeaves(epoch: number) {
        return this._db.count('StateTreeLeaf', {
            epoch: epoch,
            attesterId: this.attesterId.toString(),
        })
    }

    // unirep event handlers

    async handleStateTreeLeaf({ event, db, decodedData }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const index = Number(decodedData.index)
        const attesterId = BigInt(decodedData.attesterId).toString()
        const hash = BigInt(decodedData.leaf).toString()
        if (attesterId !== this.attesterId.toString()) return
        db.create('StateTreeLeaf', {
            epoch,
            hash,
            index,
            attesterId,
        })
        return true
    }

    async handleEpochTreeLeaf({ event, db, decodedData }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const index = BigInt(decodedData.index).toString()
        const attesterId = BigInt(decodedData.attesterId).toString()
        const epochKey = BigInt(decodedData.epochKey).toString()
        const posRep = BigInt(decodedData.posRep).toString()
        const negRep = BigInt(decodedData.negRep).toString()
        const graffiti = BigInt(decodedData.graffiti).toString()
        const timestamp = BigInt(decodedData.timestamp).toString()
        const leaf = BigInt(decodedData.leaf).toString()
        if (attesterId !== this.attesterId.toString()) return
        const id = `${epoch}-${index}-${attesterId}`
        db.upsert('EpochTreeLeaf', {
            where: {
                id,
            },
            update: {
                hash: leaf,
                posRep,
                negRep,
                graffiti,
                timestamp,
            },
            create: {
                id,
                epoch,
                index,
                attesterId,
                hash: leaf,
                epochKey,
                posRep,
                negRep,
                graffiti,
                timestamp,
            },
        })
        return true
    }

    async handleUserSignedUp({ decodedData, event, db }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const commitment = BigInt(
            decodedData.identityCommitment.toString()
        ).toString()
        const attesterId = BigInt(decodedData.attesterId.toString()).toString()
        if (attesterId !== this.attesterId.toString()) return
        db.create('UserSignUp', {
            commitment,
            epoch,
            attesterId,
        })
        return true
    }

    async handleAttestationSubmitted({
        decodedData,
        event,
        db,
    }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const epochKey = BigInt(decodedData.epochKey).toString()
        const attesterId = BigInt(decodedData.attesterId).toString()
        const posRep = Number(decodedData.posRep)
        const negRep = Number(decodedData.negRep)
        if (attesterId !== this.attesterId.toString()) return

        const index = `${event.blockNumber
            .toString()
            .padStart(15, '0')}${event.transactionIndex
            .toString()
            .padStart(8, '0')}${event.logIndex.toString().padStart(8, '0')}`

        const currentEpoch = await this.readCurrentEpoch()
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
            posRep,
            negRep,
            graffiti: decodedData.graffiti.toString(),
            timestamp: decodedData.timestamp.toString(),
            hash: hash4([
                posRep,
                negRep,
                decodedData.graffiti,
                decodedData.timestamp,
            ]).toString(),
        })
        return true
    }

    async handleUserStateTransitioned({
        decodedData,
        event,
        db,
    }: EventHandlerArgs) {
        const transactionHash = event.transactionHash
        const epoch = Number(decodedData.epoch)
        const attesterId = BigInt(decodedData.attesterId).toString()
        const nullifier = BigInt(decodedData.nullifier).toString()
        if (attesterId.toString() !== this.attesterId.toString()) return

        db.create('Nullifier', {
            epoch,
            attesterId,
            nullifier,
            transactionHash,
        })

        return true
    }

    async handleEpochEnded({ decodedData, event, db }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const attesterId = BigInt(decodedData.attesterId).toString()
        console.log(`Epoch ${epoch} ended`)
        if (attesterId !== this.attesterId.toString()) return
        db.upsert('Epoch', {
            where: {
                number: epoch,
                attesterId,
            },
            update: {
                sealed: true,
            },
            create: {
                number: epoch,
                attesterId,
                sealed: true,
            },
        })
        // create the next stub entry
        db.create('Epoch', {
            number: epoch + 1,
            attesterId,
            sealed: false,
        })
        return true
    }
}
