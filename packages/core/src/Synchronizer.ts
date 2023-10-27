import { EventEmitter } from 'events'
import { DB, TransactionDB } from 'anondb'
import { ethers } from 'ethers'
import { IncrementalMerkleTree, MAX_EPOCH } from '@unirep/utils'
import UNIREP_ABI from '@unirep/contracts/abi/Unirep.json'
import { schema } from './schema'
import { nanoid } from 'nanoid'
// TODO: consolidate these into 'anondb' index
import { constructSchema } from 'anondb/types'
import { MemoryConnector } from 'anondb/web'
import AsyncLock from 'async-lock'

/**
 * The type of data to be processed in an event handler.
 */
type EventHandlerArgs = {
    event: ethers.Event
    decodedData: { [key: string]: any }
    db: TransactionDB
}

/**
 * The settings of an attester.
 */
type AttesterSetting = {
    startTimestamp: number
    epochLength: number
}

/**
 * Turn either a decimal or hex string to a decimal string.
 * @param content A `bigint`, `string` or `number` type data.
 * @returns A decimal string.
 */
export function toDecString(content: bigint | string | number) {
    return BigInt(content).toString()
}

/**
 * The synchronizer is used to construct the Unirep state. After events are emitted from the Unirep contract,
 * the synchronizer will verify the events and then save the states.
 * @example
 * ```ts
 * import { Synchronizer } from '@unirep/core'
 *
 * const state = new Synchronizer({
 *   unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
 *   provider, // an ethers.js provider
 * })
 *
 * // start the synchronizer deamon
 * await state.start()
 * await state.waitForSync()
 *
 * // stop the synchronizer deamon
 * state.stop()
 * ```
 */
export class Synchronizer extends EventEmitter {
    /**
     * @private
     * The database object.
     */
    private _db: DB
    /**
     * @private
     * The provider which is connected in the synchronizer.
     */
    private _provider: ethers.providers.Provider
    /**
     * @private
     * The UniRep smart contract object which is connected in the synchronizer.
     */
    private _unirepContract: ethers.Contract
    /**
     * @private
     * The array of attester IDs which are synchronized in the synchronizer.
     */
    private _attesterId: bigint[] = []
    /**
     * @private
     * The circuits settings.
     */
    private _settings: any
    /**
     * @private
     * The settings of attesters. There are `startTimestamp` and `epochLength` of each attester.
     */
    private _attesterSettings: { [key: string]: AttesterSetting } = {}
    /**
     * @protected
     * The default zero [state tree](https://developer.unirep.io/docs/protocol/trees#state-tree) leaf.
     */
    protected defaultStateTreeLeaf: bigint = BigInt(0)
    /**
     * @protected
     * The default zero [epoch tree](https://developer.unirep.io/docs/protocol/trees#epoch-tree) leaf.
     */
    protected defaultEpochTreeLeaf: bigint = BigInt(0)
    /**
     * @private
     * Indicates if the synchronizer is to sync with all Unirep attesters.
     */
    private _syncAll = false

    /**
     * @private
     * The mapping of the event name and its handler
     */
    private _eventHandlers: any
    /**
     * @private
     * The mapping of a contract address and its event filters.
     */
    private _eventFilters: any

    /**
     * @private
     * The id of the poll event.
     */
    private pollId: string | null = null
    /**
     * How frequently the synchronizer will poll the blockchain for new events (specified in milliseconds). Default: `5000`
     */
    public pollRate: number = 5000
    /**
     * How many blocks the synchronizer will query on each poll. Default: `100000`
     */
    public blockRate: number = 10000
    /**
     * Allow passing the genesis block as the starting block for querying events
     */
    private _genesisBlock: number = 0

    /**
     * @private
     * Check if a setup is completed or not.
     */
    private setupComplete = false
    /**
     * @private
     * If a setup is not completed, there will be a setup promise.
     */
    private setupPromise: any

    /**
     * @private
     * Lock on poll event.
     */
    private lock = new AsyncLock()

    /**
     * @private
     * Load events promises.
     */
    private promises: any[] = []
    /**
     * @private
     * Unprocessed events.
     */
    private _blocks: any[] = []
    /**
     * @private
     * The latest completed block number.
     */
    private _blockEnd: Number = 0

    constructor(config: {
        db?: DB
        attesterId?: bigint | bigint[]
        provider: ethers.providers.Provider
        unirepAddress: string
        genesisBlock?: number
    }) {
        super()
        const { db, unirepAddress, provider, attesterId, genesisBlock } = config

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
        this._unirepContract = new ethers.Contract(
            unirepAddress,
            UNIREP_ABI,
            provider
        )
        this._provider = provider
        this._genesisBlock = genesisBlock ?? 0
        this._settings = {
            stateTreeDepth: 0,
            epochTreeDepth: 0,
            historyTreeDepth: 0,
            numEpochKeyNoncePerEpoch: 0,
            epochLength: 0,
            fieldCount: 0,
            sumFieldCount: 0,
            replNonceBits: 0,
            replFieldBits: 0,
        }

        this.setup().then(() => (this.setupComplete = true))
    }

    private buildEventHandlers() {
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
    }

    /**
     * Read the database object.
     */
    get db(): DB {
        return this._db
    }

    /**
     * Read the provider which is connected in the synchronizer.
     */
    get provider(): ethers.providers.Provider {
        return this._provider
    }

    /**
     * Read the UniRep smart contract object which is connected in the synchronizer.
     */
    get unirepContract(): ethers.Contract {
        return this._unirepContract
    }

    /**
     * Read the settings of the UniRep smart contract.
     */
    get settings() {
        return this._settings
    }

    /**
     * Read the genesis block of the provider environment.
     */
    get genesisBlock() {
        return this._genesisBlock
    }

    /**
     * The default attester ID that is set when constructed.
     * If there is a list of attester IDs, then the first one will be the default attester ID.
     * If no attester ID is given during construction, all attesters will be synchronized and the default `attesterId` will be `BigInt(0)`.
     *
     * :::caution
     * The default attester ID should be checked carefully while synchronizing more than one attester.
     * The default attester ID can be changed with [setAttesterId](#setattesterid).
     * :::
     */
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

    /**
     * Change default [attesterId](#attesterid) to another attester ID.
     * It will fail if an `attesterId` is not synchronized during construction.
     * @param attesterId The default attester Id to be set.
     */
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

    /**
     * Check if attester events are synchronized in this synchronizer.
     * @param attesterId The queried attester ID.
     * @returns True if the attester events are synced, false otherwise.
     */
    attesterExist(attesterId: string | bigint) {
        return this._attesterId.indexOf(BigInt(attesterId)) !== -1
    }

    /**
     * Check if attester events are synchronized in this synchronizer. It will throw an error if the attester is not synchronized.
     * @param attesterId The queried attester ID.
     */
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

    /**
     * Run setup promises.
     * @returns Setup promises.
     */
    async setup() {
        if (!this.setupPromise) {
            this.setupPromise = this._setup().catch((err) => {
                this.setupPromise = undefined
                this.setupComplete = false
                throw err
            })
        }
        return this.setupPromise
    }

    /**
     * Query settings from smart contract and setup event handlers.
     */
    async _setup() {
        if (this.setupComplete) return
        const config = await this.unirepContract.config()
        this.settings.stateTreeDepth = config.stateTreeDepth
        this.settings.epochTreeDepth = config.epochTreeDepth
        this.settings.historyTreeDepth = config.historyTreeDepth
        this.settings.numEpochKeyNoncePerEpoch = config.numEpochKeyNoncePerEpoch
        this.settings.fieldCount = config.fieldCount
        this.settings.sumFieldCount = config.sumFieldCount
        this.settings.replNonceBits = config.replNonceBits
        this.settings.replFieldBits = config.replFieldBits

        this.buildEventHandlers()
        await this._findStartBlock()
        this.setupComplete = true
    }

    /**
     * Find the attester's genesis block in the Unirep smart contract.
     * Then store the `startTimestamp` and `epochLength` in database and in the memory.
     */
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
        const events = await this.unirepContract.queryFilter(
            filter,
            this._genesisBlock
        )
        if (events.length === 0) {
            throw new Error(
                `@unirep/core:Synchronizer: failed to fetch genesis event`
            )
        }

        await this._db.transaction(async (db) => {
            for (let event of events) {
                const decodedData =
                    this.unirepContract.interface.decodeEventLog(
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

                db.upsert('SynchronizerState', {
                    where: {
                        attesterId: toDecString(attesterId),
                    },
                    create: {
                        attesterId: toDecString(attesterId),
                        latestCompleteBlock: syncStartBlock,
                    },
                    update: {},
                })
            }
        })
    }

    /**
     * Start the synchronizer daemon.
     * Start polling the blockchain for new events. If we're behind the HEAD block we'll poll many times quickly
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
                    await this.loadBlocks(this.blockRate)
                } catch (err) {
                    console.error(`--- unable to load blocks`)
                    console.error(err)
                    console.error(`---`)
                }
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
                await this.loadBlocks(this.blockRate)
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

    /**
     * Manually poll for new events.
     * Returns a boolean indicating whether the synchronizer has synced to the head of the blockchain.
     */
    async poll(): Promise<{ complete: boolean }> {
        return this.lock.acquire('poll', () => this._poll())
    }

    /**
     * @private
     * Execute polling events and processing events.
     */
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
        const latestBlock = await this.provider.getBlockNumber()

        const newEvents = this._blocks
        this._blocks = []

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
                latestCompleteBlock: this._blockEnd,
            },
        })

        return {
            complete: latestBlock === this._blockEnd,
        }
    }

    /**
     * Load more events from the smart contract.
     * @param n How many blocks will be loaded.
     */
    async loadBlocks(n: number) {
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
        const count = Math.ceil((latestBlock - blockStart + 1) / n)
        this._blockEnd = latestBlock
        if (count <= 0) return

        const promises = Array.from(Array(count).keys()).map(async (_, i) => {
            return this.loadNewEvents(
                blockStart + n * i,
                Math.min(blockStart + n * (i + 1) - 1, latestBlock)
            )
        })

        await Promise.all(promises)
        this.promises.sort((a, b) => {
            return a.blockNumber - b.blockNumber
        })
        const tmp: any[] = []
        for (const chunk of this.promises) {
            if (chunk === undefined || chunk.length === 0) {
                continue
            }
            for (const block of chunk) {
                this._blocks.splice(0, 0, block)
            }
        }
        this.promises = tmp
    }

    /**
     * Load new event from smart contract.
     * @param fromBlock From which block number.
     * @param toBlock To which block number.
     * @returns All events in the block range.
     */
    async loadNewEvents(fromBlock: number, toBlock: number) {
        const promises = [] as any[]
        const minBackOff = 128

        for (const address of Object.keys(this.contracts)) {
            const { contract } = this.contracts[address]
            const filter = this._eventFilters[address]
            let backoff = minBackOff
            for (;;) {
                try {
                    const request = contract.queryFilter(
                        filter,
                        fromBlock,
                        toBlock
                    )
                    promises.push(request)
                    request.then((r) => {
                        this.promises.push(r)
                    })
                    break
                } catch (err) {
                    console.error(`--- unable to load new events`)
                    console.error(err)
                    console.error(`---`)
                    backoff *= 2
                }
                await new Promise((r) => setTimeout(r, backoff))
            }
        }
        return Promise.all(promises)
    }

    /**
     * Overwrite this to query events in different attester addresses.
     * @example
     * ```ts
     * export class AppSynchronizer extends Synchronizer {
     * ...
     *   get contracts(){
     *     return {
     *       ...super.contracts,
     *       [this.appContract.address]: {
     *           contract: this.appContract,
     *           eventNames: [
     *             'Event1',
     *             'Event2',
     *             'Event3',
     *             ...
     *           ]
     *       }
     *   }
     * }
     * ```
     */
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
                    'HistoryTreeLeaf',
                ],
            },
        }
    }

    /**
     * Process events with each event handler.
     * @param events The array of events will be proccessed.
     */
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
     * Wait for the synchronizer to sync up to a certain block.
     * By default this will wait until the current latest known block (according to the provider).
     * @param blockNumber The block number to be synced to.
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

    /**
     * Get the latest processed epoch from the database.
     *
     * :::caution
     * This value may mismatch the onchain value depending on synchronization status.
     * :::
     * @param attesterId The queried attester Id.
     * @returns `{number: number, sealed: boolean}`
     */
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

    /**
     * Calculate the current epoch determining the amount of time since the attester registration timestamp.
     * This operation is **synchronous** and does not involve any database operations.
     * @param attesterId The queried attester Id.
     * @returns The number of current calculated epoch.
     */
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

    /**
     * Calculate the amount of time remaining in the current epoch. This operation is **synchronous** and does not involve any database operations.
     * @param attesterId The queried attester Id.
     * @returns Current calculated time to the next epoch.
     */
    calcEpochRemainingTime(attesterId: bigint | string = this.attesterId) {
        const timestamp = Math.floor(+new Date() / 1000)
        const currentEpoch = this.calcCurrentEpoch(attesterId)
        const decAttesterId = toDecString(attesterId)
        const { startTimestamp, epochLength } =
            this._attesterSettings[decAttesterId]
        const epochEnd = startTimestamp + (currentEpoch + 1) * epochLength
        return Math.max(0, epochEnd - timestamp)
    }

    /**
     * Load the current epoch number from the blockchain.
     *
     * :::tip
     * Use this function in test environments where the blockchain timestamp may not match the real timestamp (e.g. due to snapshot/revert patterns).
     * :::
     * @param attesterId The queried attester Id.
     * @returns The number of current epoch on-chain.
     */
    async loadCurrentEpoch(attesterId: bigint | string = this.attesterId) {
        const epoch = await this.unirepContract.attesterCurrentEpoch(attesterId)
        return Number(epoch)
    }

    /**
     * Get the epoch tree root for a certain epoch.
     * @param epoch The epoch to be queried.
     * @param attesterId The attester to be queried.
     * @returns The epoch tree root.
     */
    async epochTreeRoot(
        epoch: number,
        attesterId: bigint | string = this.attesterId
    ) {
        return this.unirepContract.attesterEpochRoot(attesterId, epoch)
    }

    /**
     * Build a merkle inclusion proof for the tree from a certain epoch.
     * @param epoch The epoch to be queried.
     * @param leafIndex The leaf index to be queried.
     * @param attesterId The attester to be queried.
     * @returns The merkle proof of the epoch tree index.
     */
    async epochTreeProof(
        epoch: number,
        leafIndex: any,
        attesterId: bigint | string = this.attesterId
    ) {
        const tree = await this.genEpochTree(epoch, attesterId)
        const proof = tree.createProof(leafIndex)
        return proof
    }

    /**
     * Determine if a [nullifier](https://developer.unirep.io/docs/protocol/nullifiers) exists. All nullifiers are stored in a single mapping and expected to be globally unique.
     * @param nullifier A nullifier to be queried.
     * @returns True if the nullifier exists on-chain before, false otherwise.
     */
    async nullifierExist(nullifier: any) {
        const epochEmitted = await this.unirepContract.usedNullifiers(nullifier)
        return epochEmitted.gt(0)
    }

    /**
     * Build the latest state tree for a certain epoch.
     * @param epoch The epoch to be queried.
     * @param attesterId The attester to be queried.
     * @returns The state tree.
     */
    async genStateTree(
        epoch: number | bigint,
        attesterId: bigint | string = this.attesterId
    ): Promise<IncrementalMerkleTree> {
        this.checkAttesterId(attesterId)
        const _epoch = Number(epoch.toString())
        const tree = new IncrementalMerkleTree(
            this.settings.stateTreeDepth,
            this.defaultStateTreeLeaf
        )
        const leaves = await this._db.findMany('StateTreeLeaf', {
            where: {
                epoch: _epoch,
                attesterId: toDecString(attesterId),
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const leaf of leaves) {
            tree.insert(leaf.hash)
        }
        return tree
    }

    /**
     * Build the latest history tree for the current attester.
     * @param attesterId The attester to be queried.
     * @returns The history tree.
     */
    async genHistoryTree(
        attesterId: bigint | string = this.attesterId
    ): Promise<IncrementalMerkleTree> {
        const tree = new IncrementalMerkleTree(this.settings.historyTreeDepth)
        const _attesterId = toDecString(attesterId)
        this.checkAttesterId(_attesterId)
        const leaves = await this._db.findMany('HistoryTreeLeaf', {
            where: {
                attesterId: _attesterId,
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const { leaf } of leaves) {
            tree.insert(leaf)
        }
        return tree
    }

    /**
     * Build the latest epoch tree for a certain epoch.
     * @param epoch The epoch to be queried.
     * @param attesterId The attester to be queried.
     * @returns The epoch tree.
     */
    async genEpochTree(
        epoch: number | bigint,
        attesterId: bigint | string = this.attesterId
    ): Promise<IncrementalMerkleTree> {
        this.checkAttesterId(attesterId)
        const _epoch = Number(epoch.toString())
        const tree = new IncrementalMerkleTree(
            this.settings.epochTreeDepth,
            this.defaultEpochTreeLeaf
        )
        const leaves = await this._db.findMany('EpochTreeLeaf', {
            where: {
                epoch: _epoch,
                attesterId: toDecString(attesterId),
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const { hash } of leaves) {
            tree.insert(hash)
        }
        return tree
    }

    /**
     * Determine if a state root exists in a certain epoch.
     * @param root The queried global state tree root
     * @param epoch The queried epoch of the global state tree
     * @param attesterId The attester to be queried.
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
     * @note
     * :::caution
     * Epoch tree root of current epoch might change frequently and the tree root is not stored everytime.
     * Try use this function when querying the epoch tree in the **previous epoch**.
     * :::
     * @param root The queried epoch tree root
     * @param epoch The queried epoch of the epoch tree
     * @param attesterId The attester to be queried.
     * @returns True if the epoch tree root is in the database, false otherwise.
     */
    async epochTreeRootExists(
        root: bigint | string,
        epoch: number,
        attesterId: bigint | string = this.attesterId
    ): Promise<boolean> {
        const _root = await this.unirepContract.attesterEpochRoot(
            attesterId,
            epoch
        )
        return _root.toString() === root.toString()
    }

    /**
     * Get the number of state tree leaves in a certain epoch.
     * @param epoch The queried epoch.
     * @returns The number of the state tree leaves.
     */
    async numStateTreeLeaves(
        epoch: number,
        attesterId: bigint | string = this.attesterId
    ) {
        this.checkAttesterId(attesterId)
        return this._db.count('StateTreeLeaf', {
            epoch,
            attesterId: toDecString(attesterId),
        })
    }

    // unirep event handlers
    /**
     * Handle state tree leaf event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
    async handleStateTreeLeaf({ event, db, decodedData }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const index = Number(decodedData.index)
        const attesterId = toDecString(decodedData.attesterId)
        const hash = toDecString(decodedData.leaf)
        if (!this.attesterExist(attesterId)) return
        const existing = await this._db.findOne('StateTreeLeaf', {
            where: {
                hash,
            },
        })
        if (existing) return true
        db.create('StateTreeLeaf', {
            epoch,
            hash,
            index,
            attesterId,
            blockNumber: event.blockNumber,
        })
        return true
    }

    /**
     * Handle epoch tree leaf event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
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

    /**
     * Handle user signup event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
    async handleUserSignedUp({ decodedData, event, db }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const commitment = toDecString(decodedData.identityCommitment)
        const attesterId = toDecString(decodedData.attesterId)
        const leafIndex = toDecString(decodedData.leafIndex)
        const { blockNumber } = event
        if (!this.attesterExist(attesterId)) return
        const existing = await this._db.findOne('UserSignUp', {
            where: {
                commitment,
                attesterId,
            },
        })
        if (existing) return true
        db.create('UserSignUp', {
            commitment,
            epoch,
            attesterId,
            blockNumber,
        })
        return true
    }

    /**
     * Handle attestation event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
    async handleAttestation({ decodedData, event, db }: EventHandlerArgs) {
        const epoch = Number(decodedData.epoch)
        const epochKey = toDecString(decodedData.epochKey)
        const attesterId = toDecString(decodedData.attesterId)
        const fieldIndex = Number(decodedData.fieldIndex)
        const change = toDecString(decodedData.change)
        const { blockNumber } = event
        if (!this.attesterExist(attesterId)) return

        const index = `${event.blockNumber
            .toString()
            .padStart(15, '0')}${event.transactionIndex
            .toString()
            .padStart(8, '0')}${event.logIndex.toString().padStart(8, '0')}`

        const currentEpoch = await this.readCurrentEpoch(attesterId)
        if (epoch !== currentEpoch.number && epoch !== MAX_EPOCH) {
            throw new Error(
                `Synchronizer: Epoch (${epoch}) must be the same as the current synced epoch ${currentEpoch.number}`
            )
        }
        db.upsert('Attestation', {
            where: {
                index,
            },
            update: {},
            create: {
                epoch,
                epochKey,
                index,
                attesterId,
                fieldIndex,
                change,
                blockNumber,
            },
        })
        if (epoch === MAX_EPOCH) return true
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

    /**
     * Handle user state transition event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
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
        db.upsert('Nullifier', {
            where: {
                nullifier,
            },
            update: {},
            create: {
                epoch,
                attesterId,
                nullifier,
                transactionHash,
                blockNumber,
            },
        })
        return true
    }

    /**
     * Handle epoch ended event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
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
        const newEpochExists = await this._db.findOne('Epoch', {
            where: {
                number: number + 1,
                attesterId,
            },
        })
        if (newEpochExists) return true
        // create the next stub entry
        db.create('Epoch', {
            number: number + 1,
            attesterId,
            sealed: false,
        })
        return true
    }

    /**
     * Handle attester signup event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
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
            db.upsert('SynchronizerState', {
                where: {
                    attesterId: _id,
                },
                update: {},
                create: {
                    attesterId: _id,
                    latestCompleteBlock: event.blockNumber - 1,
                },
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

    /**
     * Handle history tree leaf event
     * @param args `EventHandlerArgs` type arguments.
     * @returns True if succeeds, false otherwise.
     */
    async handleHistoryTreeLeaf({ decodedData, event, db }: EventHandlerArgs) {
        const attesterId = BigInt(decodedData.attesterId).toString()
        const leaf = BigInt(decodedData.leaf).toString()
        if (!this.attesterExist(attesterId)) return
        const index = await this._db.count('HistoryTreeLeaf', {
            attesterId,
        })
        const id = `${index}-${attesterId}`
        db.upsert('HistoryTreeLeaf', {
            where: {
                id,
            },
            update: {},
            create: {
                id,
                index,
                attesterId,
                leaf,
            },
        })
        return true
    }
}
