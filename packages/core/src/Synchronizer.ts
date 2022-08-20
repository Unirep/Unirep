import { EventEmitter } from 'events'
import { DB, TransactionDB } from 'anondb'
import { ethers } from 'ethers'
import { Attestation, IAttestation } from '@unirep/contracts'
import { Prover } from '@unirep/circuits'
import { IncrementalMerkleTree } from '@unirep/crypto'
import { ISettings } from './interfaces'

/**
 * The synchronizer is used to construct the Unirep state. After events are emitted from the Unirep contract,
 * the synchronizer will verify the events and then save the states.
 */
export class Synchronizer extends EventEmitter {
    protected _db: DB
    prover: Prover
    provider: any
    unirepContract: ethers.Contract
    public settings: ISettings
    // GST for current epoch
    private _globalStateTree?: IncrementalMerkleTree
    protected defaultGSTLeaf?: BigInt

    private get globalStateTree() {
        if (!this._globalStateTree) {
            throw new Error('Synchronizer: in memory GST not initialized')
        }
        return this._globalStateTree
    }

    /**
     * Maybe we can default the DB argument to an in memory implementation so
     * that downstream packages don't have to worry about it unless they want
     * to persist things?
     **/
    constructor(db: DB, prover: Prover, unirepContract: ethers.Contract) {
        super()
        this._db = db
        this.unirepContract = unirepContract
        this.provider = this.unirepContract.provider
        this.prover = prover
        this.settings = {
            globalStateTreeDepth: 0,
            userStateTreeDepth: 0,
            epochTreeDepth: 0,
            numEpochKeyNoncePerEpoch: 0,
            attestingFee: ethers.utils.parseEther('0'),
            epochLength: 0,
            maxReputationBudget: 0,
            numAttestationsPerProof: 0,
        }
    }

    async setup() {
        const config = await this.unirepContract.config()
        this.settings.globalStateTreeDepth = config.globalStateTreeDepth
        this.settings.userStateTreeDepth = config.userStateTreeDepth
        this.settings.epochTreeDepth = config.epochTreeDepth
        this.settings.numEpochKeyNoncePerEpoch =
            config.numEpochKeyNoncePerEpoch.toNumber()
        this.settings.attestingFee = config.attestingFee
        this.settings.epochLength = config.epochLength.toNumber()
        this.settings.maxReputationBudget =
            config.maxReputationBudget.toNumber()
        this.settings.numAttestationsPerProof =
            config.numAttestationsPerProof.toNumber()
        // load the GST for the current epoch
        // assume we're resuming a sync using the same database
        const epochs = await this._db.findMany('Epoch', {
            where: {
                sealed: false,
            },
        })
        if (epochs.length > 1) {
            throw new Error('Multiple unsealed epochs')
        }
        this.defaultGSTLeaf = BigInt(0)
        this._globalStateTree = new IncrementalMerkleTree(
            this.settings.globalStateTreeDepth,
            this.defaultGSTLeaf
        )
        // if it's a new sync, start with epoch 1
        const epoch = epochs[0]?.number ?? 1
        // otherwise load the leaves and insert them
        // TODO: index consistency verification, ensure that indexes are
        // sequential and no entries are skipped, e.g. 1,2,3,5,6,7
        const leaves = await this._db.findMany('GSTLeaf', {
            where: {
                epoch,
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const leaf of leaves) {
            this.globalStateTree.insert(leaf.hash)
        }
    }

    /**
     * Start synchronize the events with Unirep contract util a `stop()` is called.
     * The synchronizer will check the database first to check if
     * there is some states stored in database
     */
    async start() {
        await this.setup()
        const state = await this._db.findOne('SynchronizerState', {
            where: {},
        })
        if (!state) {
            await this._db.create('SynchronizerState', {
                latestProcessedBlock: 0,
                latestProcessedTransactionIndex: 0,
                latestProcessedEventIndex: 0,
                latestCompleteBlock: 0,
            })
        }
        this.startDaemon()
    }

    /**
     * Stop synchronizing with Unirep contract.
     */
    async stop() {
        const waitForStopped = new Promise((rs) => this.once('__stopped', rs))
        if (!this.emit('__stop')) {
            this.removeAllListeners('__stopped')
            throw new Error('No daemon is listening')
        }
        await waitForStopped
    }

    private async startDaemon() {
        const stoppedPromise = new Promise((rs) =>
            this.once('__stop', () => rs(null))
        )
        const waitForNewBlock = (afterBlock: number) =>
            new Promise(async (rs) => {
                const _latestBlock = await this.provider.getBlockNumber()
                if (_latestBlock > afterBlock) return rs(_latestBlock)
                this.provider.once('block', rs)
            })
        const startState = await this._db.findOne('SynchronizerState', {
            where: {},
        })
        let latestProcessed = startState?.latestCompleteBlock ?? 0
        for (;;) {
            const newBlockNumber = await Promise.race([
                waitForNewBlock(latestProcessed),
                stoppedPromise,
            ])
            // if newBlockNumber is null the daemon has been stopped
            if (newBlockNumber === null) break
            const allEvents = await this.loadNewEvents(
                latestProcessed + 1,
                newBlockNumber as number
            )
            const state = await this._db.findOne('SynchronizerState', {
                where: {},
            })
            if (!state) throw new Error('State not initialized')
            const unprocessedEvents = allEvents.filter((e) => {
                if (e.blockNumber === state.latestProcessedBlock) {
                    if (
                        e.transactionIndex ===
                        state.latestProcessedTransactionIndex
                    ) {
                        return e.logIndex > state.latestProcessedEventIndex
                    }
                    return (
                        e.transactionIndex >
                        state.latestProcessedTransactionIndex
                    )
                }
                return e.blockNumber > state.latestProcessedBlock
            })
            await this.processEvents(unprocessedEvents)
            await this._db.update('SynchronizerState', {
                where: {},
                update: {
                    latestCompleteBlock: newBlockNumber,
                },
            })
            latestProcessed = newBlockNumber
        }
        this.removeAllListeners('__stop')
        this.emit('__stopped')
    }

    // Overridden in subclasses
    async loadNewEvents(fromBlock: number, toBlock: number) {
        return this.unirepContract.queryFilter(
            this.unirepFilter,
            fromBlock,
            toBlock
        )
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
                    const handler = this.topicHandlers[event.topics[0]]
                    if (!handler) {
                        throw new Error(
                            `Unrecognized event topic "${event.topics[0]}"`
                        )
                    }
                    success = await handler(event, db)
                    db.update('SynchronizerState', {
                        where: {},
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
                where: {},
            })
            if (state && state.latestCompleteBlock >= latestBlock) return
            await new Promise((r) => setTimeout(r, 250))
        }
    }

    async loadCurrentEpoch() {
        const currentEpoch = await this._db.findOne('Epoch', {
            where: {},
            orderBy: {
                number: 'desc',
            },
        })
        return (
            currentEpoch || {
                number: 1,
                sealed: false,
            }
        )
    }

    protected async _checkCurrentEpoch(epoch: number) {
        const currentEpoch = await this.loadCurrentEpoch()
        if (epoch !== currentEpoch.number) {
            throw new Error(
                `Synchronizer: Epoch (${epoch}) must be the same as the current epoch ${currentEpoch.number}`
            )
        }
    }

    protected async _checkValidEpoch(epoch: number) {
        const currentEpoch = await this.loadCurrentEpoch()
        if (epoch > currentEpoch.number) {
            throw new Error(
                `Synchronizer: Epoch (${epoch}) must be less than the current epoch ${currentEpoch.number}`
            )
        }
    }

    protected async _checkEpochKeyRange(epochKey: string) {
        if (BigInt(epochKey) >= BigInt(2 ** this.settings.epochTreeDepth)) {
            throw new Error(
                `Synchronizer: Epoch key (${epochKey}) greater than max leaf value(2**epochTreeDepth)`
            )
        }
    }

    async epochTreeRoot(epoch: number) {
        return this.unirepContract.epochRoots(epoch)
    }

    async epochTreeProof(epoch: number, leafIndex: any) {
        const proof = await this.unirepContract.epochTreeProof(epoch, leafIndex)
        return proof
    }

    async nullifierExist(nullifier: any) {
        const epochEmitted = await this.unirepContract.usedNullifiers(nullifier)
        return epochEmitted.gt(0)
    }

    async genGSTree(epoch: number): Promise<IncrementalMerkleTree> {
        await this._checkValidEpoch(epoch)
        const tree = new IncrementalMerkleTree(
            this.settings.globalStateTreeDepth,
            this.defaultGSTLeaf
        )
        const leaves = await this._db.findMany('GSTLeaf', {
            where: {
                epoch,
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
     * Check if the global state tree root is stored in the database
     * @param GSTRoot The queried global state tree root
     * @param epoch The queried epoch of the global state tree
     * @returns True if the global state tree root exists, false otherwise.
     */
    async GSTRootExists(GSTRoot: BigInt | string, epoch: number) {
        await this._checkValidEpoch(epoch)
        return this.unirepContract.globalStateTreeRoots(epoch, GSTRoot)
    }

    /**
     * Check if the epoch tree root is stored in the database.
     * @param _epochTreeRoot The queried epoch tree root
     * @param epoch The queried epoch of the epoch tree
     * @returns True if the epoch tree root is in the database, false otherwise.
     */
    async epochTreeRootExists(
        _epochTreeRoot: BigInt | string,
        epoch: number
    ): Promise<boolean> {
        await this._checkValidEpoch(epoch)
        const root = await this.unirepContract.epochRoots(epoch)
        return root.toString() === _epochTreeRoot.toString()
    }

    /**
     * Get the number of global state tree leaves in a given epoch.
     * @param epoch The epoch query
     * @returns The number of the global state tree leaves
     */
    async getNumGSTLeaves(epoch: number) {
        await this._checkValidEpoch(epoch)
        return this._db.count('GSTLeaf', {
            epoch: epoch,
        })
    }

    /**
     * Get the list of attestations that is set to the epoch key.
     * The attestations are verified valid.
     * @param epochKey The query epoch key
     * @returns A list of the attestations.
     */
    async getAttestations(epochKey: string): Promise<IAttestation[]> {
        await this._checkEpochKeyRange(epochKey)
        // TODO: transform db entries to IAttestation (they're already pretty similar)
        return this._db.findMany('Attestation', {
            where: {
                epochKey,
            },
        })
    }

    // get a function that will process an event for a topic
    get topicHandlers() {
        const [UserSignedUp] = this.unirepContract.filters.UserSignedUp()
            .topics as string[]
        const [UserStateTransitioned] =
            this.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        const [AttestationSubmitted] =
            this.unirepContract.filters.AttestationSubmitted()
                .topics as string[]
        const [EpochEnded] = this.unirepContract.filters.EpochEnded()
            .topics as string[]
        const [NewGSTLeaf] = this.unirepContract.filters.NewGSTLeaf()
            .topics as string[]
        return {
            [UserSignedUp]: this.userSignedUpEvent.bind(this),
            [UserStateTransitioned]: this.USTEvent.bind(this),
            [AttestationSubmitted]: this.attestationEvent.bind(this),
            [EpochEnded]: this.epochEndedEvent.bind(this),
            [NewGSTLeaf]: this.newGSTLeaf.bind(this),
        } as {
            [key: string]: (
                event: ethers.Event,
                db: TransactionDB
            ) => Promise<undefined | boolean>
        }
    }

    get unirepFilter() {
        const [UserSignedUp] = this.unirepContract.filters.UserSignedUp()
            .topics as string[]
        const [UserStateTransitioned] =
            this.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        const [AttestationSubmitted] =
            this.unirepContract.filters.AttestationSubmitted()
                .topics as string[]
        const [EpochEnded] = this.unirepContract.filters.EpochEnded()
            .topics as string[]
        const [NewGSTLeaf] = this.unirepContract.filters.NewGSTLeaf()
            .topics as string[]

        return {
            address: this.unirepContract.address,
            topics: [
                [
                    UserSignedUp,
                    UserStateTransitioned,
                    AttestationSubmitted,
                    EpochEnded,
                    NewGSTLeaf,
                ],
            ],
        }
    }

    // unirep event handlers

    async newGSTLeaf(event: ethers.Event, db: TransactionDB) {
        const epoch = Number(event.topics[1])
        const leaf = BigInt(event.topics[2])
        const index = Number(event.topics[3])

        db.create('GSTLeaf', {
            epoch,
            hash: leaf.toString(),
            index,
        })
        return true
    }

    async userSignedUpEvent(event: ethers.Event, db: TransactionDB) {
        const decodedData = this.unirepContract.interface.decodeEventLog(
            'UserSignedUp',
            event.data
        )
        const epoch = Number(event.topics[1])
        const idCommitment = BigInt(event.topics[2])
        const attesterId = Number(decodedData.attesterId)
        const airdrop = Number(decodedData.airdropAmount)
        db.create('UserSignUp', {
            commitment: idCommitment.toString(),
            epoch,
            attesterId,
            airdrop,
        })
        return true
    }

    async attestationEvent(event: ethers.Event, db: TransactionDB) {
        const _epoch = Number(event.topics[1])
        const _epochKey = BigInt(event.topics[2])
        const _attester = event.topics[3]
        const decodedData = this.unirepContract.interface.decodeEventLog(
            'AttestationSubmitted',
            event.data
        )

        const index = `${event.blockNumber
            .toString()
            .padStart(15, '0')}${event.transactionIndex
            .toString()
            .padStart(8, '0')}${event.logIndex.toString().padStart(8, '0')}`

        await this._checkCurrentEpoch(_epoch)
        await this._checkEpochKeyRange(_epochKey.toString())

        const attestation = new Attestation(
            BigInt(decodedData.attestation.attesterId),
            BigInt(decodedData.attestation.posRep),
            BigInt(decodedData.attestation.negRep),
            BigInt(decodedData.attestation.graffiti),
            BigInt(decodedData.attestation.signUp)
        )
        db.create('Attestation', {
            epoch: _epoch,
            epochKey: _epochKey.toString(),
            index: index,
            attester: _attester,
            attesterId: Number(decodedData.attestation.attesterId),
            posRep: Number(decodedData.attestation.posRep),
            negRep: Number(decodedData.attestation.negRep),
            graffiti: decodedData.attestation.graffiti.toString(),
            signUp: Number(decodedData.attestation?.signUp),
            hash: attestation.hash().toString(),
        })
        return true
    }

    async USTEvent(event: ethers.Event, db: TransactionDB) {
        const decodedData = this.unirepContract.interface.decodeEventLog(
            'UserStateTransitioned',
            event.data
        )

        const transactionHash = event.transactionHash
        const epoch = Number(event.topics[1])
        const leaf = BigInt(event.topics[2])
        const nullifier = decodedData.firstEpkNullifier

        db.create('Nullifier', {
            epoch,
            nullifier: nullifier.toString(),
            transactionHash: event.transactionHash,
        })

        return true
    }

    async epochEndedEvent(event: ethers.Event, db: TransactionDB) {
        const epoch = Number(event?.topics[1])
        console.log(`Epoch ${epoch} ended`)
        db.upsert('Epoch', {
            where: {
                number: epoch,
            },
            update: {
                sealed: true,
                // epochRoot: tree.root.toString(),
            },
            create: {
                number: epoch,
                sealed: true,
                // epochRoot: tree.root.toString(),
            },
        })
        // create the next stub entry
        db.create('Epoch', {
            number: epoch + 1,
            sealed: false,
        })
        return true
    }
}
