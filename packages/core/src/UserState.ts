import { ethers } from 'ethers'
import assert from 'assert'
import { DB } from 'anondb'
import {
    stringifyBigInts,
    ZkIdentity,
    genEpochKey,
    genStateTreeLeaf,
    genUserStateTransitionNullifier,
    hash5,
} from '@unirep/utils'
import {
    Circuit,
    Prover,
    ReputationProof,
    EpochKeyProof,
    SignupProof,
    UserStateTransitionProof,
} from '@unirep/circuits'
import { Synchronizer } from './Synchronizer'

/**
 * User state is used for a user to generate proofs and obtain the current user status.
 * It takes user's `ZKIdentity` and checks the events that matches the user's identity.
 */
export default class UserState extends Synchronizer {
    public id: ZkIdentity

    get commitment() {
        return this.id.genIdentityCommitment()
    }

    constructor(config: {
        db: DB
        prover: Prover
        unirepAddress: string
        provider: ethers.providers.Provider
        attesterId: bigint
        _id: ZkIdentity
    }) {
        super(config)
        this.id = config._id
    }

    /**
     * Query if the user is signed up in the unirep state.
     * @returns True if user has signed up in unirep contract, false otherwise.
     */
    async hasSignedUp(): Promise<boolean> {
        const signup = await this._db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
                attesterId: this.attesterId.toString(),
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
        const currentEpoch = await this.loadCurrentEpoch()
        let latestTransitionedEpoch = 0
        for (let x = currentEpoch; x >= 0; x--) {
            const epkNullifier = genUserStateTransitionNullifier(
                this.id.identityNullifier,
                this.attesterId.toString(),
                x
            )
            const n = await this._db.findOne('Nullifier', {
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
            const signup = await this._db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
                    attesterId: this.attesterId.toString(),
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
        const currentEpoch = _epoch ?? this.calcCurrentEpoch()
        const latestTransitionedEpoch = await this.latestTransitionedEpoch()
        if (latestTransitionedEpoch !== currentEpoch) return -1
        if (latestTransitionedEpoch === 0) {
            const signup = await this._db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
                    attesterId: this.attesterId.toString(),
                },
            })
            if (!signup) {
                throw new Error('user is not signed up')
            }
            if (signup.epoch !== currentEpoch) {
                return 0
            }
            const leaf = genStateTreeLeaf(
                this.id.identityNullifier,
                this.attesterId.toString(),
                signup.epoch,
                0,
                0,
                0,
                0
            )
            const foundLeaf = await this._db.findOne('StateTreeLeaf', {
                where: {
                    hash: leaf.toString(),
                },
            })
            if (!foundLeaf) return -1
            return foundLeaf.index
        }
        const { posRep, negRep, graffiti, timestamp } = await this.getRep(
            latestTransitionedEpoch - 1
        )
        const leaf = genStateTreeLeaf(
            this.id.identityNullifier,
            this.attesterId.toString(),
            latestTransitionedEpoch,
            posRep,
            negRep,
            graffiti,
            timestamp
        )
        const foundLeaf = await this._db.findOne('StateTreeLeaf', {
            where: {
                epoch: currentEpoch,
                hash: leaf.toString(),
            },
        })
        if (!foundLeaf) return -1
        return foundLeaf.index
    }

    getEpochKeys(_epoch?: bigint | number, nonce?: number) {
        const epoch = _epoch ?? this.calcCurrentEpoch()
        if (
            typeof nonce === 'number' &&
            nonce >= this.settings.numEpochKeyNoncePerEpoch
        ) {
            throw new Error(
                `getEpochKeys nonce ${nonce} exceeds max nonce value ${this.settings.numEpochKeyNoncePerEpoch}`
            )
        }
        if (typeof nonce === 'number') {
            return genEpochKey(
                this.id.identityNullifier,
                this.attesterId.toString(),
                epoch,
                nonce
            )
        }
        return Array(this.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.identityNullifier,
                    this.attesterId.toString(),
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
    public getRep = async (
        _toEpoch?: number
    ): Promise<{ posRep; negRep; graffiti; timestamp }> => {
        let posRep = BigInt(0)
        let negRep = BigInt(0)
        let graffiti = BigInt(0)
        let timestamp = BigInt(0)
        const orClauses = [] as any[]
        const attesterId = this.attesterId
        const toEpoch = _toEpoch ?? this.calcCurrentEpoch()
        for (let x = 0; x <= toEpoch; x++) {
            const epks = Array(this.settings.numEpochKeyNoncePerEpoch)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        this.id.identityNullifier,
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
        if (orClauses.length === 0)
            return { posRep, negRep, graffiti, timestamp }
        const attestations = await this._db.findMany('Attestation', {
            where: {
                OR: orClauses,
                attesterId: attesterId.toString(),
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const a of attestations) {
            posRep += BigInt(a.posRep)
            negRep += BigInt(a.negRep)
            if (a.timestamp && BigInt(a.timestamp) > timestamp) {
                graffiti = BigInt(a.graffiti)
                timestamp = BigInt(a.timestamp)
            }
        }
        return { posRep, negRep, graffiti, timestamp }
    }

    public async getProvableRep(): Promise<{
        posRep
        negRep
        graffiti
        timestamp
    }> {
        const epoch = await this.latestTransitionedEpoch()
        return this.getRep(epoch - 1)
    }

    public getRepByEpochKey = async (
        epochKey: bigint | string,
        epoch: number | bigint | string
    ) => {
        let posRep = BigInt(0)
        let negRep = BigInt(0)
        let graffiti = BigInt(0)
        let timestamp = BigInt(0)
        const attestations = await this._db.findMany('Attestation', {
            where: {
                epoch: Number(epoch),
                epochKey: epochKey.toString(),
                attesterId: this.attesterId.toString(),
            },
        })
        for (const a of attestations) {
            posRep += BigInt(a.posRep)
            negRep += BigInt(a.negRep)
            if (a.timestamp && BigInt(a.timestamp) > timestamp) {
                graffiti = BigInt(a.graffiti)
                timestamp = BigInt(a.timestamp)
            }
        }
        return { posRep, negRep, graffiti, timestamp }
    }

    /**
     * Check if user has signed up in Unirep
     */
    private _checkUserSignUp = async () => {
        assert(
            await this.hasSignedUp(),
            'UserState: User has not signed up yet'
        )
    }

    /**
     * Check if epoch key nonce is valid
     */
    private _checkEpkNonce = (epochKeyNonce: number) => {
        assert(
            epochKeyNonce < this.settings.numEpochKeyNoncePerEpoch,
            `epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
        )
    }

    public genUserStateTransitionProof = async (
        options: { toEpoch?: bigint | number } = {}
    ): Promise<UserStateTransitionProof> => {
        const { toEpoch: _toEpoch } = options
        const fromEpoch = await this.latestTransitionedEpoch()
        const { posRep, negRep, graffiti, timestamp } = await this.getRep(
            fromEpoch - 1
        )
        const toEpoch = _toEpoch ?? this.calcCurrentEpoch()
        if (fromEpoch.toString() === toEpoch.toString()) {
            throw new Error('Cannot transition to same epoch')
        }
        const epochTree = await this.genEpochTree(fromEpoch)
        const epochKeys = Array(this.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.identityNullifier,
                    this.attesterId.toString(),
                    fromEpoch,
                    i
                )
            )
        const epochKeyLeafIndices = await Promise.all(
            epochKeys.map(async (epk) => {
                const leaf = await this._db.findOne('EpochTreeLeaf', {
                    where: {
                        epochKey: epk.toString(),
                    },
                })
                return leaf?.index ?? 0
            })
        )
        const epochKeyRep = await Promise.all(
            epochKeys.map(async (epochKey, i) => {
                const { posRep, negRep, graffiti, timestamp } =
                    await this.getRepByEpochKey(epochKey, fromEpoch)
                const proof = epochTree._createProof(epochKeyLeafIndices[i])
                return { epochKey, posRep, negRep, graffiti, timestamp, proof }
            })
        )
        const repByEpochKey = epochKeyRep.reduce((acc, obj) => {
            return {
                [obj.epochKey.toString()]: obj,
                ...acc,
            }
        }, {})
        const leaves = await this.genEpochTreePreimages(fromEpoch)
        const epochKeyProofs = epochKeys.map((key) => {
            const { posRep, negRep, graffiti, timestamp } =
                repByEpochKey[key.toString()]
            const leaf = hash5([key, posRep, negRep, graffiti, timestamp])
            let noninclusionLeaves = [0, 1]
            let noninclusionIndex = 0
            let noninclusionElements = [
                Array(this.settings.epochTreeArity).fill(0),
                Array(this.settings.epochTreeArity).fill(0),
            ]
            let inclusionIndex = 0
            let inclusionElements = Array(this.settings.epochTreeArity).fill(0)
            let treeElements, treeIndices
            if (leaves.length === 0) {
                // no attestation in the epoch
                // we don't do inclusion or noninclusion
                treeElements = epochTree._createProof(0).siblings.slice(1)
                treeIndices = epochTree._createProof(0).pathIndices.slice(1)
            } else if (
                posRep === BigInt(0) &&
                negRep === BigInt(0) &&
                graffiti === BigInt(0) &&
                timestamp === BigInt(0)
            ) {
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
        const stateTree = await this.genStateTree(fromEpoch)
        const stateTreeProof = stateTree.createProof(latestLeafIndex)
        const circuitInputs = {
            from_epoch: fromEpoch,
            to_epoch: toEpoch,
            identity_nullifier: this.id.identityNullifier,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            attester_id: this.attesterId.toString(),
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti,
            timestamp,
            new_pos_rep: epochKeyRep.map(({ posRep }) => posRep),
            new_neg_rep: epochKeyRep.map(({ negRep }) => negRep),
            new_graffiti: epochKeyRep.map(({ graffiti }) => graffiti),
            new_timestamp: epochKeyRep.map(({ timestamp }) => timestamp),
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
     * Generate a reputation proof of current user state and given conditions
     * @param epkNonce The nonce determines the output of the epoch key
     * @param minRep The amount of reputation that user wants to prove. It should satisfy: `posRep - negRep >= minRep`
     * @returns The reputation proof of type `ReputationProof`.
     */
    public genProveReputationProof = async (options: {
        epkNonce: number
        minRep?: number
        graffitiPreImage?: bigint | string
    }): Promise<ReputationProof> => {
        const { epkNonce, minRep, graffitiPreImage } = options
        this._checkEpkNonce(epkNonce)
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestStateTreeLeafIndex(epoch)
        const { posRep, negRep, graffiti, timestamp } = await this.getRep(
            epoch - 1
        )
        const stateTree = await this.genStateTree(epoch)
        const stateTreeProof = stateTree.createProof(leafIndex)

        const circuitInputs = {
            identity_nullifier: this.id.identityNullifier,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti,
            timestamp,
            graffiti_pre_image: graffitiPreImage ?? 0,
            control: ReputationProof.buildControlInput({
                epoch,
                nonce: epkNonce,
                attesterId: this.attesterId.toString(),
                proveGraffiti: graffitiPreImage ? 1 : 0,
                minRep: minRep ?? 0,
                maxRep: 0,
                proveMinRep: !!(minRep ?? 0) ? 1 : 0,
            }),
        }

        const results = await this.prover.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts(circuitInputs)
        )

        return new ReputationProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    /**
     * Generate a user sign up proof of current user state and the given attester ID
     * @returns The sign up proof of type `SignUpProof`.
     */
    public genUserSignUpProof = async (
        options: { epoch?: number | bigint } = {}
    ): Promise<SignupProof> => {
        const epoch = options.epoch ?? this.calcCurrentEpoch()
        const circuitInputs = {
            epoch,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            attester_id: this.attesterId.toString(),
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
        const tree = await this.genStateTree(epoch)
        const leafIndex = await this.latestStateTreeLeafIndex(epoch)
        const { posRep, negRep, graffiti, timestamp } = await this.getRep(
            epoch - 1
        )
        const proof = tree.createProof(leafIndex)
        const circuitInputs = {
            identity_nullifier: this.id.identityNullifier,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti,
            timestamp,
            data: options.data ?? BigInt(0),
            state_tree_elements: proof.siblings,
            state_tree_indexes: proof.pathIndices,
            control: EpochKeyProof.buildControlInput({
                epoch,
                nonce,
                attesterId: this.attesterId.toString(),
                revealNonce: options.revealNonce ? 1 : 0,
            }),
        }
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            stringifyBigInts(circuitInputs)
        )
        return new EpochKeyProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }
}

export { UserState }
