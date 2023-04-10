import { ethers } from 'ethers'
import { DB } from 'anondb'
import { Identity } from '@semaphore-protocol/identity'
import {
    stringifyBigInts,
    genEpochKey,
    genStateTreeLeaf,
    F,
    hash2,
} from '@unirep/utils'
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
 * User state is used for a user to generate proofs and obtain the current user status.
 * It takes user's `ZKIdentity` and checks the events that matches the user's identity.
 */
export default class UserState {
    public id: Identity
    public sync: Synchronizer

    get commitment() {
        return this.id.commitment
    }

    constructor(
        config:
            | {
                  db?: DB
                  attesterId?: bigint | bigint[]
                  unirepAddress: string
                  prover: Prover
                  provider: ethers.providers.Provider
                  _id?: Identity // TODO: remove this and only accept as second arg
              }
            | Synchronizer,
        id: Identity
    ) {
        if (config instanceof Synchronizer) {
            if (!id) {
                throw new Error(
                    '@unirep/core:UserState: id must be supplied as second argument when initialized with a sync'
                )
            }
            this.sync = config
            this.id = id
        } else {
            this.id = config._id ?? id
            delete config._id
            this.sync = new Synchronizer(config)
        }
    }

    async start() {
        await this.sync.start()
    }

    async waitForSync(n?: number) {
        await this.sync.waitForSync(n)
    }

    stop() {
        this.sync.stop()
    }

    /**
     * Query if the user is signed up in the unirep state.
     * @returns True if user has signed up in unirep contract, false otherwise.
     */
    async hasSignedUp(
        attesterId: bigint | string = this.sync.attesterId
    ): Promise<boolean> {
        this._checkSync()
        this.sync.checkAttesterId(attesterId)
        const signup = await this.sync._db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
                attesterId: toDecString(attesterId),
            },
        })
        return !!signup
    }

    /**
     * Query the latest user state transition epoch. If user hasn't performed user state transition,
     * the function will return the epoch which user has signed up in Unirep contract.
     * @returns The latest epoch where user performs user state transition.
     */
    async latestTransitionedEpoch(
        _attesterId: bigint | string = this.sync.attesterId
    ): Promise<number> {
        this._checkSync()
        const attesterId = toDecString(_attesterId)
        this.sync.checkAttesterId(attesterId)
        const currentEpoch = await this.sync.loadCurrentEpoch(attesterId)
        let latestTransitionedEpoch = 0
        for (let x = currentEpoch; x >= 0; x--) {
            const nullifiers = [
                0,
                this.sync.settings.numEpochKeyNoncePerEpoch,
            ].map((v) =>
                genEpochKey(this.id.secret, attesterId, x, v).toString()
            )
            const n = await this.sync._db.findOne('Nullifier', {
                where: {
                    nullifier: nullifiers,
                },
            })
            if (n) {
                latestTransitionedEpoch = n.epoch
                break
            }
        }
        if (latestTransitionedEpoch === 0) {
            const signup = await this.sync._db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
                    attesterId,
                },
            })
            if (!signup) return 0
            return signup.epoch
        }
        return latestTransitionedEpoch
    }

    /**
     * Get the latest global state tree leaf index for an epoch.
     * @param _epoch Get the global state tree leaf index of the given epoch
     * @returns The the latest global state tree leaf index for an epoch.
     */
    async latestStateTreeLeafIndex(
        _epoch?: number,
        _attesterId: bigint | string = this.sync.attesterId
    ): Promise<number> {
        const attesterId = toDecString(_attesterId)
        if (!(await this.hasSignedUp(attesterId))) return -1
        const currentEpoch = _epoch ?? this.sync.calcCurrentEpoch(attesterId)
        const latestTransitionedEpoch = await this.latestTransitionedEpoch(
            attesterId
        )
        if (latestTransitionedEpoch !== currentEpoch) return -1
        if (latestTransitionedEpoch === 0) {
            const signup = await this.sync._db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
                    attesterId: attesterId,
                },
            })
            if (!signup) {
                throw new Error('@unirep/core:UserState: user is not signed up')
            }
            if (signup.epoch !== currentEpoch) {
                return 0
            }
            // don't include attestations that are not provable
            const data = await this.getData(currentEpoch - 1)
            const leaf = genStateTreeLeaf(
                this.id.secret,
                attesterId,
                signup.epoch,
                data
            )
            const foundLeaf = await this.sync._db.findOne('StateTreeLeaf', {
                where: {
                    hash: leaf.toString(),
                },
            })
            if (!foundLeaf) return -1
            return foundLeaf.index
        }
        const data = await this.getData(latestTransitionedEpoch - 1)
        const leaf = genStateTreeLeaf(
            this.id.secret,
            attesterId,
            latestTransitionedEpoch,
            data
        )
        const foundLeaf = await this.sync._db.findOne('StateTreeLeaf', {
            where: {
                epoch: currentEpoch,
                hash: leaf.toString(),
            },
        })
        if (!foundLeaf) return -1
        return foundLeaf.index
    }

    getEpochKeys(
        _epoch?: bigint | number,
        nonce?: number,
        _attesterId: bigint | string = this.sync.attesterId
    ) {
        this._checkSync()
        const attesterId = toDecString(_attesterId)
        const epoch = _epoch ?? this.sync.calcCurrentEpoch(attesterId)
        this._checkEpkNonce(nonce ?? 0)
        if (typeof nonce === 'number') {
            return genEpochKey(this.id.secret, attesterId, epoch, nonce)
        }
        return Array(this.sync.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) => genEpochKey(this.id.secret, attesterId, epoch, i))
    }

    /**
     * Get the reputation object from the attester
     * @param toEpoch The latest epoch that the reputation is accumulated
     * @returns The reputation object
     */
    public getData = async (
        _toEpoch?: number,
        _attesterId: bigint | string = this.sync.attesterId
    ): Promise<bigint[]> => {
        const data = Array(this.sync.settings.fieldCount).fill(BigInt(0))
        const attesterId = toDecString(_attesterId)
        const orClauses = [] as any[]
        const toEpoch =
            _toEpoch ?? (await this.latestTransitionedEpoch(attesterId))
        const signup = await this.sync._db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
                attesterId,
            },
        })
        if (signup) {
            orClauses.push({
                epochKey: signup.commitment,
                epoch: signup.epoch,
            })
        }
        const allNullifiers = [] as any
        for (let x = signup?.epoch ?? 0; x <= toEpoch; x++) {
            allNullifiers.push(
                ...[0, this.sync.settings.numEpochKeyNoncePerEpoch].map((v) =>
                    genEpochKey(this.id.secret, attesterId, x, v).toString()
                )
            )
        }
        const foundNullifiers = await this.sync._db.findMany('Nullifier', {
            where: {
                attesterId,
                nullifier: allNullifiers,
            },
        })
        const sortedNullifiers = foundNullifiers.sort((a, b) =>
            a.epoch > b.epoch ? 1 : -1
        )
        for (let x = signup?.epoch ?? 0; x <= toEpoch; x++) {
            const epks = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(this.id.secret, attesterId, x, i).toString()
                )
            const nullifiers = [
                0,
                this.sync.settings.numEpochKeyNoncePerEpoch,
            ].map((v) =>
                genEpochKey(this.id.secret, attesterId, x, v).toString()
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
            const signedup = await this.sync._db.findOne('UserSignUp', {
                where: {
                    attesterId: attesterId,
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
        const attestations = await this.sync._db.findMany('Attestation', {
            where: {
                OR: orClauses,
                attesterId: attesterId,
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const a of attestations) {
            const { fieldIndex } = a
            if (fieldIndex < this.sync.settings.sumFieldCount) {
                data[fieldIndex] = (data[fieldIndex] + BigInt(a.change)) % F
            } else {
                data[fieldIndex] = BigInt(a.change)
                data[fieldIndex + 1] = BigInt(a.timestamp)
            }
        }
        return data
    }

    public async getProvableData(
        attesterId: bigint | string = this.sync.attesterId
    ): Promise<bigint[]> {
        const epoch = await this.latestTransitionedEpoch(attesterId)
        return this.getData(epoch - 1, attesterId)
    }

    public getDataByEpochKey = async (
        epochKey: bigint | string,
        epoch: number | bigint | string,
        _attesterId: bigint | string = this.sync.attesterId
    ) => {
        this._checkSync()
        const attesterId = toDecString(_attesterId)
        this.sync.checkAttesterId(attesterId)
        const data = Array(this.sync.settings.fieldCount).fill(BigInt(0))
        const attestations = await this.sync._db.findMany('Attestation', {
            where: {
                epoch: Number(epoch),
                epochKey: epochKey.toString(),
                attesterId: attesterId,
            },
        })
        for (const a of attestations) {
            const { fieldIndex } = a
            if (fieldIndex < this.sync.settings.sumFieldCount) {
                data[fieldIndex] = (data[fieldIndex] + BigInt(a.change)) % F
            } else {
                data[fieldIndex] = BigInt(a.change)
                data[fieldIndex + 1] = BigInt(a.timestamp)
            }
        }
        return data
    }

    /**
     * Check if epoch key nonce is valid
     */
    private _checkEpkNonce = (epochKeyNonce: number) => {
        if (epochKeyNonce >= this.sync.settings.numEpochKeyNoncePerEpoch)
            throw new Error(
                `@unirep/core:UserState: epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
            )
    }

    private _checkSync = () => {
        if (!this.sync)
            throw new Error('@unirep/core:UserState: no synchronizer is set')
    }

    public getEpochKeyIndex = async (
        epoch: number,
        _epochKey: bigint | string,
        _attesterId: bigint | string
    ) => {
        this._checkSync()
        const attestations = await this.sync._db.findMany('Attestation', {
            where: {
                epoch,
                attesterId: toDecString(_attesterId),
            },
            orderBy: {
                index: 'asc',
            },
        })
        let index = 0
        const seenEpochKeys = {} as any
        for (const { epochKey } of attestations) {
            if (seenEpochKeys[epochKey]) continue
            if (BigInt(epochKey) === BigInt(_epochKey)) {
                return index
            }
            seenEpochKeys[epochKey] = true
            index++
        }
        return 0
    }

    public genUserStateTransitionProof = async (
        options: {
            toEpoch?: bigint | number
            attesterId?: bigint | string
        } = {}
    ): Promise<UserStateTransitionProof> => {
        const { toEpoch: _toEpoch } = options
        const attesterId = toDecString(
            options.attesterId ?? this.sync.attesterId
        )
        const fromEpoch = await this.latestTransitionedEpoch(attesterId)
        const data = await this.getData(fromEpoch - 1, attesterId)
        const toEpoch = _toEpoch ?? this.sync.calcCurrentEpoch(attesterId)
        if (fromEpoch.toString() === toEpoch.toString()) {
            throw new Error(
                '@unirep/core:UserState: Cannot transition to same epoch'
            )
        }
        const epochTree = await this.sync.genEpochTree(fromEpoch, attesterId)
        const stateTree = await this.sync.genStateTree(fromEpoch, attesterId)
        const epochKeys = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(this.id.secret, attesterId, fromEpoch, i)
            )
        const historyTree = await this.sync.genHistoryTree(attesterId)
        const leafHash = hash2([stateTree.root, epochTree.root])
        const leaf = await this.sync._db.findOne('HistoryTreeLeaf', {
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
            const leafCount = await this.sync._db.count('HistoryTreeLeaf', {
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
                const proof = epochTree.createProof(epochKeyLeafIndices[i])
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
            state_tree_indexes: stateTreeProof.pathIndices,
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
        }
        const results = await this.sync.prover.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts(circuitInputs)
        )

        return new UserStateTransitionProof(
            results.publicSignals,
            results.proof,
            this.sync.prover
        )
    }

    /**
     * Generate a reputation proof of current user state and given conditions
     * @param epkNonce The nonce determines the output of the epoch key
     * @param minRep The amount of reputation that user wants to prove. It should satisfy: `posRep - negRep >= minRep`
     * @param maxRep The amount of reputation that user wants to prove. It should satisfy: `negRep - posRep >= maxRep`
     * @param graffitiPreImage The graffiti pre-image that user wants to prove. It should satisfy: `hash(graffitiPreImage) == graffiti`
     * @returns The reputation proof of type `ReputationProof`.
     */
    public genProveReputationProof = async (options: {
        epkNonce?: number
        minRep?: number
        maxRep?: number
        graffitiPreImage?: bigint | string
        proveZeroRep?: boolean
        revealNonce?: boolean
        data?: bigint | string
        attesterId?: bigint | string
    }): Promise<ReputationProof> => {
        const { minRep, maxRep, graffitiPreImage, proveZeroRep, revealNonce } =
            options
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
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            data,
            prove_graffiti: graffitiPreImage ? 1 : 0,
            graffiti_pre_image: graffitiPreImage ?? 0,
            reveal_nonce: revealNonce ?? 0,
            attester_id: attesterId.toString(),
            epoch,
            nonce,
            min_rep: minRep ?? 0,
            max_rep: maxRep ?? 0,
            prove_min_rep: !!(minRep ?? 0) ? 1 : 0,
            prove_max_rep: !!(maxRep ?? 0) ? 1 : 0,
            prove_zero_rep: proveZeroRep ?? 0,
            sig_data: options.data ?? 0,
        }

        const results = await this.sync.prover.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts(circuitInputs)
        )

        return new ReputationProof(
            results.publicSignals,
            results.proof,
            this.sync.prover
        )
    }

    /**
     * Generate a user sign up proof of current user state and the given attester ID
     * @returns The sign up proof of type `SignUpProof`.
     */
    public genUserSignUpProof = async (
        options: { epoch?: number | bigint; attesterId?: bigint | string } = {}
    ): Promise<SignupProof> => {
        const attesterId = toDecString(
            options.attesterId ?? this.sync.attesterId
        )
        const epoch = options.epoch ?? this.sync.calcCurrentEpoch(attesterId)
        const circuitInputs = {
            epoch,
            identity_nullifier: this.id.nullifier,
            identity_trapdoor: this.id.trapdoor,
            attester_id: attesterId,
        }
        const results = await this.sync.prover.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts(circuitInputs)
        )
        return new SignupProof(
            results.publicSignals,
            results.proof,
            this.sync.prover
        )
    }

    public genEpochKeyProof = async (
        options: {
            nonce?: number
            epoch?: number
            data?: bigint
            revealNonce?: boolean
            attesterId?: bigint | string
        } = {}
    ): Promise<EpochKeyProof> => {
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
            state_tree_indexes: proof.pathIndices,
            epoch,
            nonce,
            attester_id: attesterId,
            reveal_nonce: options.revealNonce ? 1 : 0,
        }
        const results = await this.sync.prover.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts(circuitInputs)
        )
        return new EpochKeyProof(
            results.publicSignals,
            results.proof,
            this.sync.prover
        )
    }

    public genEpochKeyLiteProof = async (
        options: {
            nonce?: number
            epoch?: number
            data?: bigint
            revealNonce?: boolean
            attesterId?: bigint | string
        } = {}
    ): Promise<EpochKeyLiteProof> => {
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
        }
        const results = await this.sync.prover.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts(circuitInputs)
        )
        return new EpochKeyLiteProof(
            results.publicSignals,
            results.proof,
            this.sync.prover
        )
    }
}

export { UserState }
