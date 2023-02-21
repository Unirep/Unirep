import { ethers } from 'ethers'
import assert from 'assert'
import { DB } from 'anondb'
import {
    stringifyBigInts,
    ZkIdentity,
    genEpochKey,
    genStateTreeLeaf,
    genUserStateTransitionNullifier,
    genEpochTreeLeaf,
    F,
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
import { Synchronizer } from './Synchronizer'

/**
 * User state is used for a user to generate proofs and obtain the current user status.
 * It takes user's `ZKIdentity` and checks the events that matches the user's identity.
 */
export default class UserState {
    public id: ZkIdentity
    public sync: Synchronizer

    get commitment() {
        return this.id.genIdentityCommitment()
    }

    constructor(
        config:
            | {
                  db?: DB
                  attesterId?: bigint
                  unirepAddress: string
                  prover: Prover
                  provider: ethers.providers.Provider
                  _id?: ZkIdentity // TODO: remove this and only accept as second arg
              }
            | Synchronizer,
        id: ZkIdentity
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

    async waitForSync(n?: number) {
        await this.sync.waitForSync(n)
    }

    /**
     * Query if the user is signed up in the unirep state.
     * @returns True if user has signed up in unirep contract, false otherwise.
     */
    async hasSignedUp(): Promise<boolean> {
        const signup = await this.sync._db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
                attesterId: this.sync.attesterId.toString(),
            },
        })
        return !!signup
    }

    /**
     * Query the latest user state transition epoch. If user hasn't performed user state transition,
     * the function will return the epoch which user has signed up in Unirep contract.
     * @returns The latest epoch where user performs user state transition.
     */
    async latestTransitionedEpoch(): Promise<number> {
        const currentEpoch = await this.sync.loadCurrentEpoch()
        let latestTransitionedEpoch = 0
        for (let x = currentEpoch; x >= 0; x--) {
            const epkNullifier = genUserStateTransitionNullifier(
                this.id.secretHash,
                this.sync.attesterId.toString(),
                x
            )
            const n = await this.sync._db.findOne('Nullifier', {
                where: {
                    nullifier: epkNullifier.toString(),
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
                    attesterId: this.sync.attesterId.toString(),
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
    async latestStateTreeLeafIndex(_epoch?: number): Promise<number> {
        if (!(await this.hasSignedUp())) return -1
        const currentEpoch = _epoch ?? this.sync.calcCurrentEpoch()
        const latestTransitionedEpoch = await this.latestTransitionedEpoch()
        if (latestTransitionedEpoch !== currentEpoch) return -1
        if (latestTransitionedEpoch === 0) {
            const signup = await this.sync._db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
                    attesterId: this.sync.attesterId.toString(),
                },
            })
            if (!signup) {
                throw new Error('user is not signed up')
            }
            if (signup.epoch !== currentEpoch) {
                return 0
            }
            const leaf = genStateTreeLeaf(
                this.id.secretHash,
                this.sync.attesterId.toString(),
                signup.epoch,
                Array(this.sync.settings.fieldCount).fill(0)
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
            this.id.secretHash,
            this.sync.attesterId.toString(),
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

    getEpochKeys(_epoch?: bigint | number, nonce?: number) {
        const epoch = _epoch ?? this.sync.calcCurrentEpoch()
        if (
            typeof nonce === 'number' &&
            nonce >= this.sync.settings.numEpochKeyNoncePerEpoch
        ) {
            throw new Error(
                `getEpochKeys nonce ${nonce} exceeds max nonce value ${this.sync.settings.numEpochKeyNoncePerEpoch}`
            )
        }
        if (typeof nonce === 'number') {
            return genEpochKey(
                this.id.secretHash,
                this.sync.attesterId.toString(),
                epoch,
                nonce
            )
        }
        return Array(this.sync.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.secretHash,
                    this.sync.attesterId.toString(),
                    epoch,
                    i
                )
            )
    }

    /**
     * Get the reputation object from the attester
     * @param toEpoch The latest epoch that the reputation is accumulated
     * @returns The reputation object
     */
    public getData = async (_toEpoch?: number): Promise<bigint[]> => {
        if (!this.sync)
            throw new Error('@unirep/core:UserState: no synchronizer is set')
        const data = Array(this.sync.settings.fieldCount).fill(BigInt(0))
        const orClauses = [] as any[]
        const attesterId = this.sync.attesterId
        const toEpoch = _toEpoch ?? this.sync.calcCurrentEpoch()
        for (let x = 0; x <= toEpoch; x++) {
            const epks = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        this.id.secretHash,
                        attesterId.toString(),
                        x,
                        i
                    ).toString()
                )
            orClauses.push({
                epochKey: epks,
                epoch: x,
            })
        }
        if (orClauses.length === 0) return data
        const attestations = await this.sync._db.findMany('Attestation', {
            where: {
                OR: orClauses,
                attesterId: attesterId.toString(),
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

    public async getProvableData(): Promise<bigint[]> {
        const epoch = await this.latestTransitionedEpoch()
        return this.getData(epoch - 1)
    }

    public getDataByEpochKey = async (
        epochKey: bigint | string,
        epoch: number | bigint | string
    ) => {
        if (!this.sync)
            throw new Error('@unirep/core:UserState: no synchronizer is set')
        const data = Array(this.sync.settings.fieldCount).fill(BigInt(0))
        const attestations = await this.sync._db.findMany('Attestation', {
            where: {
                epoch: Number(epoch),
                epochKey: epochKey.toString(),
                attesterId: this.sync.attesterId.toString(),
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
        assert(
            epochKeyNonce < this.sync.settings.numEpochKeyNoncePerEpoch,
            `epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
        )
    }

    public getEpochKeyIndex = async (
        epoch: number,
        _epochKey: bigint | string
    ) => {
        const attestations = await this.sync._db.findMany('Attestation', {
            where: {
                epoch,
            },
            orderBy: {
                index: 'asc',
            },
        })
        let index = 1
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
        options: { toEpoch?: bigint | number } = {}
    ): Promise<UserStateTransitionProof> => {
        const { toEpoch: _toEpoch } = options
        const fromEpoch = await this.latestTransitionedEpoch()
        const data = await this.getData(fromEpoch - 1)
        const toEpoch = _toEpoch ?? this.sync.calcCurrentEpoch()
        if (fromEpoch.toString() === toEpoch.toString()) {
            throw new Error('Cannot transition to same epoch')
        }
        const epochTree = await this.sync.genEpochTree(fromEpoch)
        const epochKeys = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.secretHash,
                    this.sync.attesterId.toString(),
                    fromEpoch,
                    i
                )
            )
        const epochKeyLeafIndices = await Promise.all(
            epochKeys.map(async (epk) => this.getEpochKeyIndex(fromEpoch, epk))
        )
        const epochKeyRep = await Promise.all(
            epochKeys.map(async (epochKey, i) => {
                const newData = await this.getDataByEpochKey(
                    epochKey,
                    fromEpoch
                )
                const hasChanges = newData.reduce((acc, obj) => {
                    return acc || obj != BigInt(0)
                }, false)
                const proof = epochTree._createProof(epochKeyLeafIndices[i])
                return { epochKey, hasChanges, newData, proof }
            })
        )
        const repByEpochKey = epochKeyRep.reduce((acc, obj) => {
            return {
                [obj.epochKey.toString()]: obj,
                ...acc,
            }
        }, {})
        const leaves = await this.sync.genEpochTreePreimages(fromEpoch)
        const epochKeyProofs = epochKeys.map((key) => {
            const { newData, hasChanges } = repByEpochKey[key.toString()]
            const leaf = genEpochTreeLeaf(key, newData)
            let noninclusionLeaves = [0, 1]
            let noninclusionIndex = 0
            let noninclusionElements = [
                Array(this.sync.settings.epochTreeArity).fill(0),
                Array(this.sync.settings.epochTreeArity).fill(0),
            ]
            let inclusionIndex = 0
            let inclusionElements = Array(
                this.sync.settings.epochTreeArity
            ).fill(0)
            let treeElements, treeIndices
            if (leaves.length === 0) {
                // no attestation in the epoch
                // we don't do inclusion or noninclusion
                treeElements = epochTree._createProof(0).siblings.slice(1)
                treeIndices = epochTree._createProof(0).pathIndices.slice(1)
            } else if (!hasChanges) {
                // we do a non-inclusion proof
                const gtIndex = epochTree.leaves.findIndex(
                    (l) => BigInt(l) > BigInt(leaf)
                )
                noninclusionIndex = gtIndex - 1
                noninclusionLeaves = [
                    epochTree.leaves[gtIndex - 1],
                    epochTree.leaves[gtIndex],
                ]
                noninclusionElements = [
                    epochTree._createProof(gtIndex - 1).siblings[0],
                    epochTree._createProof(gtIndex).siblings[0],
                ]
                treeElements = epochTree
                    ._createProof(gtIndex - 1)
                    .siblings.slice(1)
                treeIndices = epochTree
                    ._createProof(gtIndex - 1)
                    .pathIndices.slice(1)
            } else {
                inclusionIndex = epochTree.leaves.findIndex(
                    (l) => BigInt(l) === BigInt(leaf)
                )
                inclusionElements =
                    epochTree._createProof(inclusionIndex).siblings[0]
                treeElements = epochTree
                    ._createProof(inclusionIndex)
                    .siblings.slice(1)
                treeIndices = epochTree
                    ._createProof(inclusionIndex)
                    .pathIndices.slice(1)
            }

            return {
                treeElements,
                treeIndices,
                noninclusionLeaves,
                noninclusionIndex,
                noninclusionElements,
                inclusionIndex,
                inclusionElements,
            }
        })
        const latestLeafIndex = await this.latestStateTreeLeafIndex(fromEpoch)
        const stateTree = await this.sync.genStateTree(fromEpoch)
        const stateTreeProof = stateTree.createProof(latestLeafIndex)
        const circuitInputs = {
            from_epoch: fromEpoch,
            to_epoch: toEpoch,
            identity_secret: this.id.secretHash,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            attester_id: this.sync.attesterId.toString(),
            data,
            new_data: epochKeyRep.map(({ newData }) => newData),
            epoch_tree_elements: epochKeyProofs.map(
                ({ treeElements }) => treeElements
            ),
            epoch_tree_indices: epochKeyProofs.map(
                ({ treeIndices }) => treeIndices
            ),
            noninclusion_leaf: epochKeyProofs.map(
                ({ noninclusionLeaves }) => noninclusionLeaves
            ),
            noninclusion_leaf_index: epochKeyProofs.map(
                ({ noninclusionIndex }) => noninclusionIndex
            ),
            noninclusion_elements: epochKeyProofs.map(
                ({ noninclusionElements }) => noninclusionElements
            ),
            inclusion_leaf_index: epochKeyProofs.map(
                ({ inclusionIndex }) => inclusionIndex
            ),
            inclusion_elements: epochKeyProofs.map(
                ({ inclusionElements }) => inclusionElements
            ),
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
    }): Promise<ReputationProof> => {
        const { minRep, maxRep, graffitiPreImage, proveZeroRep, revealNonce } =
            options
        const nonce = options.epkNonce ?? 0
        this._checkEpkNonce(nonce)
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestStateTreeLeafIndex(epoch)
        const data = await this.getData(epoch - 1)
        const stateTree = await this.sync.genStateTree(epoch)
        const stateTreeProof = stateTree.createProof(leafIndex)

        const circuitInputs = {
            identity_secret: this.id.secretHash,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            data,
            prove_graffiti: graffitiPreImage ? 1 : 0,
            graffiti_pre_image: graffitiPreImage ?? 0,
            reveal_nonce: revealNonce ?? 0,
            attester_id: this.sync.attesterId.toString(),
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
        options: { epoch?: number | bigint } = {}
    ): Promise<SignupProof> => {
        const epoch = options.epoch ?? this.sync.calcCurrentEpoch()
        const circuitInputs = {
            epoch,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            attester_id: this.sync.attesterId.toString(),
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
        } = {}
    ): Promise<EpochKeyProof> => {
        const nonce = options.nonce ?? 0
        const epoch = options.epoch ?? (await this.latestTransitionedEpoch())
        const tree = await this.sync.genStateTree(epoch)
        const leafIndex = await this.latestStateTreeLeafIndex(epoch)
        const data = await this.getData(epoch - 1)
        const proof = tree.createProof(leafIndex)
        const circuitInputs = {
            identity_secret: this.id.secretHash,
            data,
            sig_data: options.data ?? BigInt(0),
            state_tree_elements: proof.siblings,
            state_tree_indexes: proof.pathIndices,
            epoch,
            nonce,
            attester_id: this.sync.attesterId.toString(),
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
        } = {}
    ): Promise<EpochKeyLiteProof> => {
        const nonce = options.nonce ?? 0
        const epoch = options.epoch ?? (await this.latestTransitionedEpoch())
        const circuitInputs = {
            identity_secret: this.id.secretHash,
            sig_data: options.data ?? BigInt(0),
            epoch,
            nonce,
            attester_id: this.sync.attesterId.toString(),
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
