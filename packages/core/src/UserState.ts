import { ethers } from 'ethers'
import assert from 'assert'
import { DB } from 'anondb'
import {
    hash2,
    stringifyBigInts,
    ZkIdentity,
    genEpochKey,
    genStateTreeLeaf,
    genEpochNullifier,
} from '@unirep/crypto'
import {
    ReputationProof,
    SignupProof,
    UserStateTransitionProof,
    AggregateEpochKeysProof,
    EpochKeyProof,
} from '@unirep/contracts'
import { Circuit, Prover } from '@unirep/circuits'
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
            const leaf = genStateTreeLeaf(
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
            this.attesterId,
            latestTransitionedEpoch
        )
        const leaf = genStateTreeLeaf(
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
                    2 ** this.settings.epochTreeDepth
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
        _attesterId?: bigint,
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
                        2 ** this.settings.epochTreeDepth
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

    public genAggregateEpochKeysProof = async (
        epochKeys: bigint[],
        newBalances: bigint[][],
        hashchainIndex: number | bigint,
        epoch?: bigint | number
    ) => {
        if (epochKeys.length > this.settings.aggregateKeyCount) {
            throw new Error(`Too many keys for circuit`)
        }
        const targetEpoch =
            epoch ?? BigInt(await this.getUnirepStateCurrentEpoch())
        const targetRoot = await this.unirepContract.attesterEpochRoot(
            this.attesterId,
            targetEpoch
        )
        const leaves = await this._db.findMany('EpochTreeLeaf', {
            where: {
                epoch: targetEpoch,
                index: epochKeys.map((k) => k.toString()),
                attesterId: this.attesterId.toString(),
            },
        })
        const leavesByEpochKey = leaves.reduce((acc, obj) => {
            return {
                ...acc,
                [obj.index]: obj,
            }
        }, {})
        const dummyEpochKeys = Array(
            this.settings.aggregateKeyCount - epochKeys.length
        )
            .fill(null)
            .map(() => '0x0000000')
        const dummyBalances = Array(
            this.settings.aggregateKeyCount - newBalances.length
        )
            .fill(null)
            .map(() => [0, 0])
        const allEpochKeys = [epochKeys, dummyEpochKeys].flat()
        const allBalances = [newBalances, dummyBalances].flat()
        const epochTree = await this.genEpochTree(targetEpoch)
        const circuitInputs = {
            start_root: epochTree.root,
            epoch: targetEpoch,
            attester_id: this.attesterId.toString(),
            epoch_keys: allEpochKeys.map((k) => k.toString()),
            epoch_key_balances: allBalances,
            old_epoch_key_hashes: allEpochKeys.map((key) => {
                const leaf = leavesByEpochKey[key.toString()]
                return leaf?.hash ?? this.defaultEpochTreeLeaf
            }),
            path_elements: allEpochKeys.map((key, i) => {
                const p = epochTree.createProof(BigInt(key))
                if (i < epochKeys.length) {
                    epochTree.update(BigInt(key), hash2(newBalances[i]))
                }
                return p
            }),
            hashchain_index: hashchainIndex,
            epoch_key_count: epochKeys.length,
        }
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.aggregateEpochKeys,
            stringifyBigInts(circuitInputs)
        )
        return new AggregateEpochKeysProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    public genVerifyEpochKeyProof = async (
        epochKeyNonce: number,
        _epoch?: number
    ): Promise<EpochKeyProof> => {
        this._checkEpkNonce(epochKeyNonce)
        const epoch = _epoch ?? (await this.latestTransitionedEpoch())
        const latestLeafIndex = await this.latestGSTLeafIndex()
        const GSTree = await this.genGSTree(epoch)
        const GSTProof = GSTree.createProof(latestLeafIndex)
        const { posRep, negRep } = await this.getRepByAttester()

        const circuitInputs = stringifyBigInts({
            gst_path_elements: GSTProof.siblings,
            gst_path_index: GSTProof.pathIndices,
            identity_nullifier: this.id.identityNullifier,
            nonce: epochKeyNonce,
            epoch: epoch,
            pos_rep: posRep,
            neg_rep: negRep,
            attester_id: this.attesterId,
        })

        const results = await this.prover.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            circuitInputs
        )

        return new EpochKeyProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }

    public genUserStateTransitionProof =
        async (): Promise<UserStateTransitionProof> => {
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
                        2 ** this.settings.epochTreeDepth
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
    public genProveReputationProof = async (
        epkNonce: number,
        minRep?: number
    ): Promise<ReputationProof> => {
        this._checkEpkNonce(epkNonce)
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestGSTLeafIndex()
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
                    2 ** this.settings.epochTreeDepth
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

export { UserState }
