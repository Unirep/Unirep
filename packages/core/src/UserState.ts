import { ethers } from 'ethers'
import { DB } from 'anondb'
import { Identity } from '@semaphore-protocol/identity'
import {
    stringifyBigInts,
    genEpochKey,
    genStateTreeLeaf,
    F,
    MAX_EPOCH,
} from '@unirep/utils'
import { poseidon2 } from 'poseidon-lite'
import {
    Circuit,
    Prover,
    ReputationProof,
    EpochKeyProof,
    SignupProof,
    UserStateTransitionProof,
    EpochKeyLiteProof,
} from '@unirep/circuits'
import { Synchronizer, toDecString } from './Synchronizer'

/**
 * The user state object is used to manage user state for an attester.
 * The state is backed by an [anondb](https://github.com/vimwitch/anondb) instance.
 * @example
 * ```ts
 * import { UserState } from '@unirep/core'
 * import { defaultProver } from '@unirep/circuits/provers/defaultProver'
 * import { Identity } from '@semaphore-protocol/identity'
 *
 * const id = new Identity()
 * const state = new UserState({
 *   prover: defaultProver, // a circuit prover
 *   unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
 *   provider, // an ethers.js provider
 *   id,
 * })
 *
 * // or, initialize with an existing synchronizer object
 * const state = new UserState({
 *   synchronizer,
 *   id,
 *   prover: defaultProver, // a circuit prover
 * })
 *
 * // start the synchoronizer deamon
 * await state.start()
 * await state.waitForSync()
 *
 * // stop the synchronizer deamon
 * state.stop()
 * ```
 */
export default class UserState {
    private _prover: Prover
    private _id: Identity
    private _sync: Synchronizer
    private _chainId: number

    /**
     * The [Semaphore](https://semaphore.pse.dev/) identity commitment of the user.
     */
    get commitment() {
        return this.id.commitment
    }

    /**
     * The [Semaphore](https://semaphore.pse.dev/) identity of the user.
     */
    get id() {
        return this._id
    }

    /**
     * The underlying synchronizer object.
     */
    get sync() {
        return this._sync
    }

    /**
     * The prover object.
     */
    get prover() {
        return this._prover
    }

    /**
     * The current chain ID of UniRep contract.
     */
    get chainId() {
        return this._chainId
    }

    constructor(config: {
        synchronizer?: Synchronizer
        db?: DB
        attesterId?: bigint | bigint[]
        unirepAddress?: string
        provider?: ethers.providers.Provider
        id: Identity
        prover: Prover
    }) {
        const {
            id,
            synchronizer,
            attesterId,
            unirepAddress,
            provider,
            prover,
            db,
        } = config
        if (!id) {
            throw new Error(
                '@unirep/core:UserState: id must be supplied as an argument when initialized with a sync'
            )
        }
        if (!prover) {
            throw new Error(
                '@unirep/core:UserState: prover must be supplied as an argument when initialized with a sync'
            )
        }
        if (synchronizer) {
            this._sync = synchronizer
        } else {
            if (!provider || !unirepAddress) {
                throw new Error(
                    '@unirep/core:UserState: provider and Unirep address must be supplied as an argument when initialized with a sync'
                )
            }
            this._sync = new Synchronizer({
                db,
                attesterId,
                provider,
                unirepAddress,
            })
        }
        this._id = id
        this._prover = prover
        this._chainId = -1 // need to be setup in async function
    }

    /**
     * Start the synchronizer daemon.
     * Start polling the blockchain for new events. If we're behind the HEAD block we'll poll many times quickly
     */
    async start() {
        await this.sync.start()
        await this._checkChainId()
    }

    /**
     * Wait for the synchronizer to sync up to a certain block.
     * By default this will wait until the current latest known block (according to the provider).
     * @param blockNumber The block number to be synced to.
     */
    async waitForSync(blockNumber?: number) {
        await this.sync.waitForSync(blockNumber)
    }

    /**
     * Stop synchronizing with Unirep contract.
     */
    stop() {
        this.sync.stop()
    }

    /**
     * Query the current database if the [Semaphore](https://semaphore.pse.dev/) identity commitment is stored.
     * @param attesterId The attester to be queried. Default: `this.attesterId`.
     * @returns True if user has signed up in unirep contract, false otherwise.
     */
    async hasSignedUp(
        attesterId: bigint | string = this.sync.attesterId
    ): Promise<boolean> {
        this._checkSync()
        this.sync.checkAttesterId(attesterId)
        const signup = await this.sync.db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
                attesterId: toDecString(attesterId),
            },
        })
        return !!signup
    }

    /**
     * Query the current database for a user's signup event or latest user state transition [nullifier](https://developer.unirep.io/docs/protocol/nullifiers).
     * @param attesterId The attester to be queried. Default: `this.attesterId`
     * @returns The latest epoch where a user performed a user state transition.
     */
    async latestTransitionedEpoch(
        attesterId: bigint | string = this.sync.attesterId
    ): Promise<number> {
        this._checkSync()
        const _attesterId = toDecString(attesterId)
        this.sync.checkAttesterId(attesterId)
        const currentEpoch = await this.sync.loadCurrentEpoch(_attesterId)
        let latestTransitionedEpoch = -1
        for (let x = currentEpoch; x >= 0; x--) {
            const nullifiers = [
                0,
                this.sync.settings.numEpochKeyNoncePerEpoch,
            ].map((v) =>
                genEpochKey(
                    this.id.secret,
                    _attesterId,
                    x,
                    v,
                    this.chainId
                ).toString()
            )
            const n = await this.sync.db.findOne('Nullifier', {
                where: {
                    nullifier: nullifiers,
                },
            })
            if (n) {
                latestTransitionedEpoch = n.epoch
                break
            }
        }
        if (latestTransitionedEpoch === -1) {
            const signup = await this.sync.db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
                    attesterId: _attesterId,
                },
            })
            if (!signup)
                throw new Error('@unirep/core:UserState user is not signed up')
            return signup.epoch
        }
        return latestTransitionedEpoch
    }

    /**
     * Get the latest global state tree leaf index for an epoch.
     * @param epoch Get the global state tree leaf index of the given epoch. Default: current epoch.
     * @param attesterId The attester to be queried. Default: `this.attesterId`
     * @returns The the latest state tree leaf index for an epoch.
     */
    async latestStateTreeLeafIndex(
        epoch?: number,
        attesterId: bigint | string = this.sync.attesterId
    ): Promise<number> {
        const _attesterId = toDecString(attesterId)
        const currentEpoch = epoch ?? this.sync.calcCurrentEpoch(_attesterId)
        const latestTransitionedEpoch = await this.latestTransitionedEpoch(
            _attesterId
        )
        if (latestTransitionedEpoch !== currentEpoch)
            throw new Error(
                '@unirep/core:UserState user has not transitioned to epoch'
            )
        const data = await this.getData(
            latestTransitionedEpoch - 1,
            _attesterId
        )
        const leaf = genStateTreeLeaf(
            this.id.secret,
            _attesterId,
            latestTransitionedEpoch,
            data,
            this.chainId
        )
        const foundLeaf = await this.sync.db.findOne('StateTreeLeaf', {
            where: {
                epoch: currentEpoch,
                hash: leaf.toString(),
            },
        })
        if (!foundLeaf)
            throw new Error(
                '@unirep/core:UserState unable to find state tree leaf index'
            )
        return foundLeaf.index
    }

    /**
     * Get epoch keys for the current user, for an epoch.
     * If a `nonce` value is supplied the return value will be a single epoch key.
     * Otherwise an array of all epoch keys will be returned.
     *
     * If no `epoch` is supplied the current epoch will be used (as determined by `synchronizer.calcCurrentEpoch`).
     * @param epoch The epoch to be queried. Default: current epoch.
     * @param nonce The specified epoch key nonce. Default: `0`.
     * @param attesterId The attester to be queried. Default: `this.attesterId`
     * @returns An epoch key or an array of epoch keys.
     */
    getEpochKeys(
        epoch?: bigint | number,
        nonce?: number,
        attesterId: bigint | string = this.sync.attesterId
    ) {
        this._checkSync()
        const _attesterId = toDecString(attesterId)
        const _epoch = epoch ?? this.sync.calcCurrentEpoch(attesterId)
        this._checkEpkNonce(nonce ?? 0)
        if (typeof nonce === 'number') {
            return genEpochKey(
                this.id.secret,
                _attesterId,
                _epoch,
                nonce,
                this.chainId
            )
        }
        return Array(this.sync.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.secret,
                    _attesterId,
                    _epoch,
                    i,
                    this.chainId
                )
            )
    }

    /**
     * This function is used to parse replacement data field to be `index` and `data`. See [replacement data field](https://developer.unirep.io/docs/protocol/data#replacement-field).
     * @param replData The raw data which is processed on-chain.
     * @returns The parsed data and the data index (nonce).
     */
    parseReplData(replData: bigint) {
        const data =
            replData / BigInt(2) ** BigInt(this.sync.settings.replNonceBits)
        const nonce =
            replData % BigInt(2) ** BigInt(this.sync.settings.replNonceBits)
        return {
            data,
            nonce,
        }
    }

    /**
     * Get the data for a user up to and including the provided epoch.
     * By default data up to and including the current epoch is returned.
     *
     * :::tip
     * If you want to make a proof of data make sure to use `getProvableData`.
     * Data can only be proven once it has been included in a state tree leaf.
     * Learn more about reputation proofs [here](https://developer.unirep.io/docs/circuits-api/classes/src.ReputationProof.md).
     * :::
     * @param toEpoch The latest epoch that the reputation is accumulated. Default: current epoch.
     * @param attesterId The attester to be queried. Default: `this.attesterId`
     * @returns The data object
     */
    public getData = async (
        toEpoch?: number,
        attesterId: bigint | string = this.sync.attesterId
    ): Promise<bigint[]> => {
        const data = Array(this.sync.settings.fieldCount).fill(BigInt(0))
        const _attesterId = toDecString(attesterId)
        const orClauses = [] as any[]
        const _toEpoch =
            toEpoch ?? (await this.latestTransitionedEpoch(_attesterId))
        const signup = await this.sync.db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
                attesterId: _attesterId,
            },
        })
        if (signup) {
            orClauses.push({
                epochKey: signup.commitment,
                epoch: MAX_EPOCH,
            })
        }
        const allNullifiers = [] as any
        for (let x = signup?.epoch ?? 0; x <= _toEpoch; x++) {
            allNullifiers.push(
                ...[0, this.sync.settings.numEpochKeyNoncePerEpoch].map((v) =>
                    genEpochKey(
                        this.id.secret,
                        _attesterId,
                        x,
                        v,
                        this.chainId
                    ).toString()
                )
            )
        }
        const sortedNullifiers = await this.sync.db.findMany('Nullifier', {
            where: {
                attesterId: _attesterId,
                nullifier: allNullifiers,
            },
            orderBy: {
                epoch: 'asc',
            },
        })
        for (let x = signup?.epoch ?? 0; x <= _toEpoch; x++) {
            const epks = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        this.id.secret,
                        _attesterId,
                        x,
                        i,
                        this.chainId
                    ).toString()
                )
            const nullifiers = [
                0,
                this.sync.settings.numEpochKeyNoncePerEpoch,
            ].map((v) =>
                genEpochKey(
                    this.id.secret,
                    _attesterId,
                    x,
                    v,
                    this.chainId
                ).toString()
            )
            let usted = false
            for (const { nullifier, epoch } of sortedNullifiers) {
                if (epoch > x) {
                    break
                }
                if (epoch === x) {
                    usted = true
                    break
                }
            }
            const signedup = await this.sync.db.findOne('UserSignUp', {
                where: {
                    attesterId: _attesterId,
                    commitment: this.commitment.toString(),
                    epoch: x,
                },
            })
            if (!usted && !signedup) continue
            orClauses.push({
                epochKey: epks,
                epoch: x,
            })
        }
        if (orClauses.length === 0) return data
        const attestations = await this.sync.db.findMany('Attestation', {
            where: {
                OR: orClauses,
                attesterId: _attesterId,
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const a of attestations) {
            const { fieldIndex } = a
            let currentNonce = BigInt(-1)
            if (fieldIndex < this.sync.settings.sumFieldCount) {
                data[fieldIndex] = (data[fieldIndex] + BigInt(a.change)) % F
            } else {
                const { nonce } = this.parseReplData(BigInt(a.change))
                if (nonce > currentNonce) {
                    data[fieldIndex] = BigInt(a.change)
                    currentNonce = nonce
                }
            }
        }
        return data
    }

    /**
     * Get the data that can be proven by the user using a state tree leaf.
     * This is the data up to, but not including, the epoch the user has transitioned into.
     * @param attesterId The attester to be queried. Default: `this.attesterId`
     * @returns The data object
     */
    public async getProvableData(
        attesterId: bigint | string = this.sync.attesterId
    ): Promise<bigint[]> {
        const epoch = await this.latestTransitionedEpoch(attesterId)
        return this.getData(epoch - 1, attesterId)
    }

    /**
     * Get the pending changes to the data owned by an epoch key.
     * @param epochKey The epoch key to be queried.
     * @param epoch The epoch of the epoch key to be queried.
     * @param attesterId The attester to be queried. Default: `this.attesterId`
     * @returns The data object.
     */
    public getDataByEpochKey = async (
        epochKey: bigint | string,
        epoch: number,
        attesterId: bigint | string = this.sync.attesterId
    ) => {
        this._checkSync()
        const _attesterId = toDecString(attesterId)
        this.sync.checkAttesterId(_attesterId)
        const data = Array(this.sync.settings.fieldCount).fill(BigInt(0))
        if (typeof epoch !== 'number') throw new Error('epoch must be number')
        const attestations = await this.sync.db.findMany('Attestation', {
            where: {
                epoch,
                epochKey: epochKey.toString(),
                attesterId: _attesterId,
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const a of attestations) {
            const { fieldIndex } = a
            let currentNonce = BigInt(-1)
            if (fieldIndex < this.sync.settings.sumFieldCount) {
                data[fieldIndex] = (data[fieldIndex] + BigInt(a.change)) % F
            } else {
                const { nonce } = this.parseReplData(BigInt(a.change))
                if (nonce > currentNonce) {
                    data[fieldIndex] = BigInt(a.change)
                    currentNonce = nonce
                }
            }
        }
        return data
    }

    /**
     * @private
     * Check if epoch key nonce is valid. Throws an error if the epoch key nonce is invalid.
     * @param epochKeyNonce The input epoch key nonce to be checked.
     */
    private _checkEpkNonce = (epochKeyNonce: number) => {
        if (epochKeyNonce >= this.sync.settings.numEpochKeyNoncePerEpoch)
            throw new Error(
                `@unirep/core:UserState: epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
            )
    }

    /**
     * @private
     * Check if a synchronizer is set. Throws an error if a synchronizer is not set.
     */
    private _checkSync = () => {
        if (!this.sync)
            throw new Error('@unirep/core:UserState: no synchronizer is set')
    }

    /**
     * @private
     * Check if a chain ID is set. If a chain ID is not set, it queries the provider and sets chain ID.
     */
    private _checkChainId = async () => {
        if (this.chainId === -1) {
            const { chainId } = await this.sync.provider.getNetwork()
            this._chainId = chainId
        }
    }

    /**
     * Get the index of epoch key among all attestations.
     * @param epoch The epoch of the epoch key to be queried.
     * @param epochKey The epoch key to be queried.
     * @param attesterId The attester to be queried.
     * @returns The index of the epoch key.
     */
    public getEpochKeyIndex = async (
        epoch: number,
        epochKey: bigint | string,
        attesterId: bigint | string
    ) => {
        this._checkSync()
        const attestations = await this.sync.db.findMany('Attestation', {
            where: {
                epoch,
                attesterId: toDecString(attesterId),
            },
            orderBy: {
                index: 'asc',
            },
        })
        let index = 0
        const seenEpochKeys = {} as any
        const inputEpochKey = epochKey
        for (const { epochKey } of attestations) {
            if (seenEpochKeys[epochKey]) continue
            if (BigInt(epochKey) === BigInt(inputEpochKey)) {
                return index
            }
            seenEpochKeys[epochKey] = true
            index++
        }
        return -1
    }

    /**
     * Generate a user state transition proof. Returns a [`UserStateTransitionProof`](https://developer.unirep.io/docs/circuits-api/classes/src.UserStateTransitionProof.md).
     * @param options.toEpoch `toEpoch` is used to indicate in which epoch the proof will be used. Default: current epoch.
     * @param options.attesterId `attesterId` is used to generate proof for certain attester. Default: `this.attesterId`.
     * @returns The `UserStateTransitionProof` object.
     * @example
     * ```ts
     * const { publicSignals, proof } = await userState.genUserStateTransitionProof()
     * ```
     */
    public genUserStateTransitionProof = async (
        options: {
            toEpoch?: number
            attesterId?: bigint | string
        } = {}
    ): Promise<UserStateTransitionProof> => {
        await this._checkChainId()
        const { toEpoch: _toEpoch } = options
        const attesterId = toDecString(
            options.attesterId ?? this.sync.attesterId
        )
        const fromEpoch = await this.latestTransitionedEpoch(attesterId)
        const data = await this.getData(fromEpoch - 1, attesterId)
        const toEpoch = _toEpoch ?? this.sync.calcCurrentEpoch(attesterId)
        if (fromEpoch === toEpoch) {
            throw new Error(
                '@unirep/core:UserState: Cannot transition to same epoch'
            )
        }
        const epochTree = await this.sync.genEpochTree(fromEpoch, attesterId)
        const stateTree = await this.sync.genStateTree(fromEpoch, attesterId)
        const epochKeys = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.secret,
                    attesterId,
                    fromEpoch,
                    i,
                    this.chainId
                )
            )
        const historyTree = await this.sync.genHistoryTree(attesterId)
        const leafHash = poseidon2([stateTree.root, epochTree.root])
        const leaf = await this.sync.db.findOne('HistoryTreeLeaf', {
            where: {
                attesterId,
                leaf: leafHash.toString(),
            },
        })
        let historyTreeProof
        if (leaf) {
            historyTreeProof = historyTree.createProof(leaf.index)
        } else {
            // the epoch hasn't been ended onchain yet
            // add the leaf offchain to make the proof
            const leafCount = await this.sync.db.count('HistoryTreeLeaf', {
                attesterId,
            })
            historyTree.insert(leafHash)
            historyTreeProof = historyTree.createProof(leafCount)
        }
        const epochKeyLeafIndices = await Promise.all(
            epochKeys.map(async (epk) =>
                this.getEpochKeyIndex(fromEpoch, epk, attesterId)
            )
        )
        const epochKeyRep = await Promise.all(
            epochKeys.map(async (epochKey, i) => {
                const newData = await this.getDataByEpochKey(
                    epochKey,
                    fromEpoch,
                    attesterId
                )
                const hasChanges = newData.reduce((acc, obj) => {
                    return acc || obj != BigInt(0)
                }, false)
                const proof =
                    epochKeyLeafIndices[i] !== -1
                        ? epochTree.createProof(epochKeyLeafIndices[i])
                        : {
                              pathIndices: Array(
                                  this.sync.settings.epochTreeDepth
                              ).fill(0),
                              siblings: Array(
                                  this.sync.settings.epochTreeDepth
                              ).fill(0),
                          }
                return { epochKey, hasChanges, newData, proof }
            })
        )
        const latestLeafIndex = await this.latestStateTreeLeafIndex(
            fromEpoch,
            attesterId
        )
        const stateTreeProof = stateTree.createProof(latestLeafIndex)
        const circuitInputs = {
            from_epoch: fromEpoch,
            to_epoch: toEpoch,
            identity_secret: this.id.secret,
            state_tree_indices: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            attester_id: attesterId.toString(),
            history_tree_indices: historyTreeProof.pathIndices,
            history_tree_elements: historyTreeProof.siblings,
            data,
            new_data: epochKeyRep.map(({ newData }) => newData),
            epoch_tree_elements: epochKeyRep.map(({ proof }) => proof.siblings),
            epoch_tree_indices: epochKeyRep.map(
                ({ proof }) => proof.pathIndices
            ),
            epoch_tree_root: epochTree.root,
            chain_id: this.chainId,
        }
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts(circuitInputs)
        )

        return new UserStateTransitionProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    /**
     * Generate a proof of reputation. Returns a [`ReputationProof`](https://developer.unirep.io/docs/circuits-api/classes/src.ReputationProof.md).
     * :::danger
     * **Please avoid assigning the `minRep = data[0] - data[1]` or `maxRep = data[1] - data[0]`.**<br/>
     * The proof could allow a user to accidentally publish their overall reputation (i.e. `data[0]-data[1]`).
     * Depending on the circumstances (such as the length of the attestation history) this could reveal a user’s epoch key(s) as well.
     * :::
     * @param options.epkNonce The nonce determines the output of the epoch key. Default: `0`.
     * @param options.minRep The amount of reputation that user wants to prove. It should satisfy: `posRep - negRep >= minRep`. Default: `0`
     * @param options.maxRep The amount of reputation that user wants to prove. It should satisfy: `negRep - posRep >= maxRep`. Default: `0`
     * @param options.graffiti The graffiti that user wants to prove. It should satisfy: `graffiti == (data[SUM_FIELD_COUNT] / (2 ** REPL_NONCE_BITS))`. Default: `0`.
     * @param options.proveZeroRep Indicates if user wants to prove `posRep - negRep == 0`. Default: `0`.
     * @param options.revealNonce Indicates if user wants to reveal epoch key nonce. Default: `false`.
     * @param options.data Indicates if user wants to endorse a 253-bits data. Default: `0`.
     * @param options.attesterId `attesterId` is used to generate proof for certain attester. Default: `this.attesterId`
     * @returns The reputation proof of type `ReputationProof`.
     * @example
     * ```ts
     * const {publicSignals, proof} = await userState.genProveReputationProof({
     *   minRep: 3,
     *   graffiti: '1234',
     * })
     * ```
     */
    public genProveReputationProof = async (options: {
        epkNonce?: number
        minRep?: number
        maxRep?: number
        graffiti?: bigint | string
        proveZeroRep?: boolean
        revealNonce?: boolean
        data?: bigint | string
        attesterId?: bigint | string
    }): Promise<ReputationProof> => {
        await this._checkChainId()
        const { minRep, maxRep, graffiti, proveZeroRep, revealNonce } = options
        const nonce = options.epkNonce ?? 0
        const attesterId = toDecString(
            options.attesterId ?? this.sync.attesterId
        )
        this._checkEpkNonce(nonce)
        const epoch = await this.latestTransitionedEpoch(attesterId)
        const leafIndex = await this.latestStateTreeLeafIndex(epoch, attesterId)
        const data = await this.getData(epoch - 1, attesterId)
        const stateTree = await this.sync.genStateTree(epoch, attesterId)
        const stateTreeProof = stateTree.createProof(leafIndex)

        const circuitInputs = {
            identity_secret: this.id.secret,
            state_tree_indices: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            data,
            prove_graffiti: graffiti ? 1 : 0,
            graffiti: BigInt(graffiti ?? 0),
            reveal_nonce: revealNonce ?? 0,
            attester_id: attesterId,
            epoch,
            nonce,
            min_rep: minRep ?? 0,
            max_rep: maxRep ?? 0,
            prove_min_rep: !!(minRep ?? 0) ? 1 : 0,
            prove_max_rep: !!(maxRep ?? 0) ? 1 : 0,
            prove_zero_rep: proveZeroRep ?? 0,
            sig_data: options.data ?? 0,
            chain_id: this.chainId,
        }

        const results = await this.prover.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts(circuitInputs)
        )

        return new ReputationProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    /**
     * Generate a proof that can be used to signup. Returns a [`SignupProof`](https://developer.unirep.io/docs/circuits-api/classes/src.SignupProof.md)
     * @param options.epoch Indicates in which epoch the proof will be used. Default: current epoch.
     * @param options.attesterId Indicates for which attester the proof will be used. Default: `this.attesterId`
     * @returns The sign up proof of type `SignUpProof`.
     * @example
     * ```ts
     * const { publicSignals, proof } = await userState.genUserSignUpProof()
     * ```
     */
    public genUserSignUpProof = async (
        options: { epoch?: number; attesterId?: bigint | string } = {}
    ): Promise<SignupProof> => {
        await this._checkChainId()
        const attesterId = toDecString(
            options.attesterId ?? this.sync.attesterId
        )
        const epoch = options.epoch ?? this.sync.calcCurrentEpoch(attesterId)
        const circuitInputs = {
            epoch,
            identity_secret: this.id.secret,
            attester_id: attesterId,
            chain_id: this.chainId,
        }
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts(circuitInputs)
        )
        return new SignupProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    /**
     * Generate a proof that a user controls an epoch key in a certain epoch.
     * Optionally provide a data value to sign.
     * Returns an [`EpochKeyProof`](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyProof.md).
     * @param options.nonce The specified epoch key nonce. Default: `0`.
     * @param options.epoch The specified epoch. Default: current epoch.
     * @param options.data Indicates if user wants to endorse a 253-bits data. Default: `0`
     * @param options.revealNonce Indicates if user wants to reveal epoch key nonce. Default: `false`.
     * @param options.attesterId Indicates for which attester the proof will be used. Default: `this.attesterId`
     * @returns The epoch key proof of type `EpochKeyProof`.
     * @example
     * ```ts
     * const { publicSignals, proof } = await userState.genEpochKeyProof({
     *   nonce: 1
     * })
     * ```
     */
    public genEpochKeyProof = async (
        options: {
            nonce?: number
            epoch?: number
            data?: bigint
            revealNonce?: boolean
            attesterId?: bigint | string
        } = {}
    ): Promise<EpochKeyProof> => {
        await this._checkChainId()
        const nonce = options.nonce ?? 0
        const attesterId = toDecString(
            options.attesterId ?? this.sync.attesterId
        )
        const epoch =
            options.epoch ?? (await this.latestTransitionedEpoch(attesterId))
        const tree = await this.sync.genStateTree(epoch, attesterId)
        const leafIndex = await this.latestStateTreeLeafIndex(epoch, attesterId)
        const data = await this.getData(epoch - 1, attesterId)
        const proof = tree.createProof(leafIndex)
        const circuitInputs = {
            identity_secret: this.id.secret,
            data,
            sig_data: options.data ?? BigInt(0),
            state_tree_elements: proof.siblings,
            state_tree_indices: proof.pathIndices,
            epoch,
            nonce,
            attester_id: attesterId,
            reveal_nonce: options.revealNonce ? 1 : 0,
            chain_id: this.chainId,
        }
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts(circuitInputs)
        )
        return new EpochKeyProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    /**
     * Generate a proof that a user controls an epoch key in a certain epoch.
     * Optionally provide a data value to sign.
     * Returns an [`EpochKeyLiteProof`](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyLiteProof.md).
     *
     * This proof **will not include a merkle tree proof** which makes the proof size smaller than an [`EpochKeyProof`](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyProof.md).
     * It can be used to prove a seen and valid epoch key.
     * @param options.nonce The specified epoch key nonce. Default: `0`.
     * @param options.epoch The specified epoch. Default: current epoch.
     * @param options.data Indicates if user wants to endorse a 253-bits data. Default: `0`.
     * @param options.revealNonce Indicates if user wants to reveal epoch key nonce. Default: `false`.
     * @param options.attesterId Indicates for which attester the proof will be used. Default: `this.attesterId`
     * @returns The epoch key lite proof of type `EpochKeyLiteProof`.
     * @example
     * ```ts
     * const { publicSignals, proof } = await userState.genEpochKeyLiteProof({
     *   nonce: 1
     * })
     * ```
     */
    public genEpochKeyLiteProof = async (
        options: {
            nonce?: number
            epoch?: number
            data?: bigint
            revealNonce?: boolean
            attesterId?: bigint | string
        } = {}
    ): Promise<EpochKeyLiteProof> => {
        await this._checkChainId()
        const nonce = options.nonce ?? 0
        const attesterId = toDecString(
            options.attesterId ?? this.sync.attesterId
        )
        const epoch =
            options.epoch ?? (await this.latestTransitionedEpoch(attesterId))
        const circuitInputs = {
            identity_secret: this.id.secret,
            sig_data: options.data ?? BigInt(0),
            epoch,
            nonce,
            attester_id: attesterId,
            reveal_nonce: options.revealNonce ? 1 : 0,
            chain_id: this.chainId,
        }
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts(circuitInputs)
        )
        return new EpochKeyLiteProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }
}

export { UserState }
