import { BigNumber, BigNumberish, ethers } from 'ethers'
import assert from 'assert'
import { DB } from 'anondb'
import {
    IncrementalMerkleTree,
    hash2,
    hash5,
    stringifyBigInts,
    hashLeftRight,
    SparseMerkleTree,
    ZkIdentity,
    unstringifyBigInts,
} from '@unirep/crypto'
import {
    IAttestation,
    Attestation,
    ReputationProof,
    EpochKeyProof,
    SignupProof,
    EpochTransitionProof,
    UpdateSparseTreeProof,
} from '@unirep/contracts'
import { genEpochKey, genGSTLeaf, genEpochNullifier } from './utils'
import { IReputation } from './interfaces'
import Reputation from './Reputation'
import { Circuit, Prover } from '@unirep/circuits'
import { Synchronizer } from './Synchronizer'

const decodeBigIntArray = (input: string): bigint[] => {
    return unstringifyBigInts(JSON.parse(input))
}

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
        unirepContract: ethers.Contract
        _id: ZkIdentity
        attesterId: bigint
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
            const epkNullifier = genEpochNullifier(
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
    async latestGSTLeafIndex(_epoch?: number): Promise<number> {
        if (!(await this.hasSignedUp())) return -1
        const currentEpoch = _epoch ?? (await this.getUnirepStateCurrentEpoch())
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
            const leaf = genGSTLeaf(
                this.id.identityNullifier,
                this.attesterId.toString(),
                signup.epoch,
                0,
                0
            )
            const foundLeaf = await this._db.findOne('GSTLeaf', {
                where: {
                    hash: leaf.toString(),
                },
            })
            if (!foundLeaf) return -1
            return foundLeaf.index
        }
        const { posRep, negRep } = await this.getRepByAttester(
            this.attesterId.toString(),
            latestTransitionedEpoch
        )
        const leaf = genGSTLeaf(
            this.id.identityNullifier,
            this.attesterId.toString(),
            latestTransitionedEpoch,
            posRep,
            negRep
        )
        const foundLeaf = await this._db.findOne('GSTLeaf', {
            where: {
                epoch: currentEpoch,
                hash: leaf.toString(),
            },
        })
        if (!foundLeaf) return -1
        return foundLeaf.index
    }

    /**
     * Proxy methods to get underlying UnirepState data
     */
    public getUnirepStateCurrentEpoch = async (): Promise<number> => {
        return (await this.readCurrentEpoch()).number
    }

    async getNumGSTLeaves(epoch: number) {
        await this._checkValidEpoch(epoch)
        return this._db.count('GSTLeaf', {
            epoch: epoch,
            attesterId: this.attesterId.toString(),
        })
    }

    async getAttestations(epochKey: string): Promise<IAttestation[]> {
        await this._checkEpochKeyRange(epochKey)
        return this._db.findMany('Attestation', {
            where: {
                epochKey,
            },
            orderBy: {
                index: 'asc',
            },
        })
    }

    async getEpochKeys(epoch: number) {
        await this._checkValidEpoch(epoch)
        return Array(this.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.identityNullifier,
                    this.attesterId.toString(),
                    epoch,
                    i,
                    this.settings.epochTreeDepth
                )
            )
    }

    /**
     * Get the reputation object from a given attester
     * @param attesterId The attester ID that the user queries
     * @param toEpoch The latest epoch that the reputation is accumulated
     * @returns The reputation object
     */
    public getRepByAttester = async (
        _attesterId?: BigInt | string,
        toEpoch?: number
    ): Promise<{ posRep; negRep }> => {
        let posRep = BigInt(0)
        let negRep = BigInt(0)
        const attesterId = _attesterId ?? this.attesterId
        const signup = await this._db.findOne('UserSignUp', {
            where: {
                attesterId: attesterId.toString(),
                commitment: this.commitment.toString(),
            },
        })
        const allEpks = [] as string[]
        const latestTransitionedEpoch = await this.latestTransitionedEpoch()
        for (let x = 0; x < (toEpoch ?? latestTransitionedEpoch); x++) {
            const epks = Array(this.settings.numEpochKeyNoncePerEpoch)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        this.id.identityNullifier,
                        attesterId.toString(),
                        x,
                        i,
                        this.settings.epochTreeDepth
                    ).toString()
                )
            allEpks.push(...epks)
        }
        if (allEpks.length === 0) return { posRep, negRep }
        const attestations = await this._db.findMany('Attestation', {
            where: {
                epochKey: allEpks,
                attesterId: attesterId.toString(),
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const a of attestations) {
            posRep += BigInt(a.posRep)
            negRep += BigInt(a.negRep)
        }
        return { posRep, negRep }
    }

    public getRepByEpochKey = async (
        epochKey: bigint | string,
        epoch: number | bigint | string
    ) => {
        let posRep = BigInt(0)
        let negRep = BigInt(0)
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
        }
        return { posRep, negRep }
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

    /**
     * Generate the epoch key proof of the current user state.
     * @param epochKeyNonce The nonce that is used in the epoch key proof.
     * @returns The epoch key proof of type `EpochKeyProof`.
     */
    // public genVerifyEpochKeyProof = async (
    //     epochKeyNonce: number
    // ): Promise<EpochKeyProof> => {
    //     this._checkEpkNonce(epochKeyNonce)
    //     const epoch = await this.latestTransitionedEpoch()
    //     const leafIndex = await this.latestGSTLeafIndex()
    //     const epochKey = genEpochKey(
    //         this.id.identityNullifier,
    //         epoch,
    //         epochKeyNonce,
    //         this.settings.epochTreeDepth
    //     )
    //     const userStateTree = await this.genUserStateTree(epoch)
    //     const GSTree = await this.genGSTree(epoch)
    //     const GSTProof = GSTree.createProof(leafIndex)

    //     const circuitInputs = stringifyBigInts({
    //         GST_path_elements: GSTProof.siblings,
    //         GST_path_index: GSTProof.pathIndices,
    //         identity_nullifier: this.id.identityNullifier,
    //         identity_trapdoor: this.id.trapdoor,
    //         user_tree_root: userStateTree.root,
    //         nonce: epochKeyNonce,
    //         epoch: epoch,
    //     })

    //     const results = await this.prover.genProofAndPublicSignals(
    //         Circuit.verifyEpochKey,
    //         circuitInputs
    //     )

    //     return new EpochKeyProof(
    //         results.publicSignals,
    //         results.proof,
    //         this.prover
    //     )
    // }

    public genAttestationProof = async (
        epochKey: bigint,
        posRep: bigint,
        negRep: bigint,
        epochTreeRoot?: bigint,
        epoch?: bigint
    ) => {
        // get the old balance of the key
        const targetEpoch =
            epoch ?? BigInt(await this.getUnirepStateCurrentEpoch())
        const targetRoot =
            epochTreeRoot ??
            (await this.unirepContract.attesterEpochRoots(
                this.attesterId,
                targetEpoch
            ))
        const existingBalance = await this.getRepByEpochKey(
            epochKey,
            targetEpoch
        )
        // verify that the existing balance exists in the tree
        const epochTree = await this.genEpochTree(targetEpoch)
        const oldLeaf = hash2([
            existingBalance.posRep,
            existingBalance.negRep,
        ]).toString()
        const leaf = await this._db.findOne('EpochTreeLeaf', {
            where: {
                epoch: Number(targetEpoch),
                leaf: oldLeaf,
                index: epochKey.toString(),
                attesterId: this.attesterId.toString(),
            },
        })
        if (
            !leaf &&
            (existingBalance.posRep.toString() !== '0' ||
                existingBalance.negRep.toString() !== '0')
        ) {
            throw new Error('Unable to find existing leaf')
        }
        const circuitInputs = {
            from_root: targetRoot,
            leaf_index: epochKey,
            pos_rep: existingBalance.posRep + posRep,
            neg_rep: existingBalance.negRep + negRep,
            old_leaf: oldLeaf,
            leaf_elements: epochTree.createProof(epochKey),
        }
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.updateSparseTree,
            stringifyBigInts(circuitInputs)
        )
        return new UpdateSparseTreeProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    public genEpochTransitionProof =
        async (): Promise<EpochTransitionProof> => {
            const { posRep, negRep } = await this.getRepByAttester()
            const fromEpoch = await this.latestTransitionedEpoch()
            const toEpoch = await this.loadCurrentEpoch()
            if (fromEpoch.toString() === toEpoch.toString()) {
                throw new Error('Cannot transition to same epoch')
            }
            const epochTree = await this.genEpochTree(fromEpoch)
            const epochKeyPromises = Array(
                this.settings.numEpochKeyNoncePerEpoch
            )
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        this.id.identityNullifier,
                        this.attesterId.toString(),
                        fromEpoch,
                        i,
                        this.settings.epochTreeDepth
                    ).toString()
                )
                .map(async (epochKey) => {
                    const { posRep, negRep } = await this.getRepByEpochKey(
                        epochKey,
                        fromEpoch
                    )
                    const proof = epochTree.createProof(BigInt(epochKey))
                    return { posRep, negRep, proof }
                })
            const epochKeyData = await Promise.all(epochKeyPromises)
            const latestLeafIndex = await this.latestGSTLeafIndex()
            const GSTree = await this.genGSTree(fromEpoch)
            const GSTProof = GSTree.createProof(latestLeafIndex)
            const circuitInputs = {
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_nullifier: this.id.identityNullifier,
                GST_path_index: GSTProof.pathIndices,
                GST_path_elements: GSTProof.siblings,
                attester_id: this.attesterId.toString(),
                pos_rep: posRep,
                neg_rep: negRep,
                new_pos_rep: epochKeyData.map(({ posRep }) => posRep),
                new_neg_rep: epochKeyData.map(({ negRep }) => negRep),
                epoch_tree_elements: epochKeyData.map(({ proof }) => proof),
                epoch_tree_root: epochTree.root,
            }
            const results = await this.prover.genProofAndPublicSignals(
                Circuit.epochTransition,
                stringifyBigInts(circuitInputs)
            )

            return new EpochTransitionProof(
                results.publicSignals,
                results.proof,
                this.prover
            )
        }

    /**
     * Generate a reputation proof of current user state and given conditions
     * @param attesterId The attester ID that the user wants to proof the reputation
     * @param epkNonce The nonce determines the output of the epoch key
     * @param minRep The amount of reputation that user wants to prove. It should satisfy: `posRep - negRep >= minRep`
     * @param proveGraffiti The boolean flag that indicates if user wants to prove graffiti pre-image
     * @param graffitiPreImage The pre-image of the graffiti
     * @param spendAmount The amount of reputation to spend.
     * In the circuit, it will compute the reputation nullifiers of the given nonce. If the reputation nullifier is used
     * to spend reputation, it cannot be spent again.
     * @returns The reputation proof of type `ReputationProof`.
     */
    public genProveReputationProof = async (
        epkNonce: number,
        minRep?: number
    ): Promise<ReputationProof> => {
        this._checkEpkNonce(epkNonce)
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestGSTLeafIndex()
        const epochKey = genEpochKey(
            this.id.identityNullifier,
            this.attesterId.toString(),
            epoch,
            epkNonce,
            this.settings.epochTreeDepth
        )
        const { posRep, negRep } = await this.getRepByAttester()
        const GSTree = await this.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(leafIndex)
        const epochTree = await this.genEpochTree(epoch)
        const epochKeyPromises = Array(this.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.identityNullifier,
                    this.attesterId.toString(),
                    epoch,
                    i,
                    this.settings.epochTreeDepth
                ).toString()
            )
            .map(async (epochKey) => {
                const { posRep, negRep } = await this.getRepByEpochKey(
                    epochKey,
                    epoch
                )
                const proof = epochTree.createProof(BigInt(epochKey))
                return { posRep, negRep, proof }
            })
        const epochKeyData = await Promise.all(epochKeyPromises)

        const circuitInputs = {
            epoch,
            epoch_key_nonce: epkNonce,
            identity_nullifier: this.id.identityNullifier,
            GST_path_index: GSTreeProof.pathIndices,
            GST_path_elements: GSTreeProof.siblings,
            attester_id: this.attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            min_rep: minRep === undefined ? 0 : minRep,
            new_pos_rep: epochKeyData.map(({ posRep }) => posRep),
            new_neg_rep: epochKeyData.map(({ negRep }) => negRep),
            epoch_tree_elements: epochKeyData.map(({ proof }) => proof),
            epoch_tree_root: epochTree.root,
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
     * @param attesterId The attester ID that the user wants to prove the sign up status
     * @returns The sign up proof of type `SignUpProof`.
     */
    public genUserSignUpProof = async (): Promise<SignupProof> => {
        const epoch = await this.getUnirepStateCurrentEpoch()
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
}

export { Reputation, UserState }
