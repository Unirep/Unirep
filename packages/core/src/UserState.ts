import { ethers } from 'ethers'
import assert from 'assert'
import { DB } from 'anondb'
import {
    hash4,
    stringifyBigInts,
    ZkIdentity,
    genEpochKey,
    genStateTreeLeaf,
    genEpochNullifier,
} from '@unirep/utils'
import {
    ReputationProof,
    EpochKeyProof,
    SignupProof,
    UserStateTransitionProof,
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
        const { posRep, negRep, graffiti, timestamp } =
            await this.getRepByAttester(
                this.attesterId.toString(),
                latestTransitionedEpoch
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

    async getEpochKeys(epoch: bigint) {
        return Array(this.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.identityNullifier,
                    this.attesterId.toString(),
                    epoch,
                    i,
                    this.settings.epochTreeArity ** this.settings.epochTreeDepth
                )
            )
    }

    /**
     * Get the reputation object from a given attester
     * @param _attesterId The attester ID that the user queries
     * @param toEpoch The latest epoch that the reputation is accumulated
     * @returns The reputation object
     */
    public getRepByAttester = async (
        _attesterId?: bigint | string,
        toEpoch?: number
    ): Promise<{ posRep; negRep; graffiti; timestamp }> => {
        let posRep = BigInt(0)
        let negRep = BigInt(0)
        let graffiti = BigInt(0)
        let timestamp = BigInt(0)
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
                        this.settings.epochTreeArity **
                            this.settings.epochTreeDepth
                    ).toString()
                )
            allEpks.push(...epks)
        }
        if (allEpks.length === 0) return { posRep, negRep, graffiti, timestamp }
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
            if (a.timestamp && BigInt(a.timestamp) > timestamp) {
                graffiti = BigInt(a.graffiti)
                timestamp = BigInt(a.timestamp)
            }
        }
        return { posRep, negRep, graffiti, timestamp }
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
        const { posRep, negRep, graffiti, timestamp } =
            await this.getRepByAttester()
        const fromEpoch = await this.latestTransitionedEpoch()
        const toEpoch = _toEpoch ?? this.calcCurrentEpoch()
        if (fromEpoch.toString() === toEpoch.toString()) {
            throw new Error('Cannot transition to same epoch')
        }
        const epochTree = await this.genEpochTree(fromEpoch)
        const epochKeyPromises = Array(this.settings.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    this.id.identityNullifier,
                    this.attesterId.toString(),
                    fromEpoch,
                    i,
                    this.settings.epochTreeArity ** this.settings.epochTreeDepth
                ).toString()
            )
            .map(async (epochKey) => {
                const { posRep, negRep, graffiti, timestamp } =
                    await this.getRepByEpochKey(epochKey, fromEpoch)
                const proof = epochTree.createProof(BigInt(epochKey))
                return { posRep, negRep, graffiti, timestamp, proof }
            })
        const epochKeyData = await Promise.all(epochKeyPromises)
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
            new_pos_rep: epochKeyData.map(({ posRep }) => posRep),
            new_neg_rep: epochKeyData.map(({ negRep }) => negRep),
            new_graffiti: epochKeyData.map(({ graffiti }) => graffiti),
            new_timestamp: epochKeyData.map(({ timestamp }) => timestamp),
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
    public genProveReputationProof = async (options: {
        epkNonce: number
        minRep?: number
        graffitiPreImage?: bigint | string
    }): Promise<ReputationProof> => {
        const { epkNonce, minRep, graffitiPreImage } = options
        this._checkEpkNonce(epkNonce)
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestStateTreeLeafIndex(epoch)
        const { posRep, negRep, graffiti, timestamp } =
            await this.getRepByAttester()
        const stateTree = await this.genStateTree(epoch)
        const stateTreeProof = stateTree.createProof(leafIndex)

        const circuitInputs = {
            epoch,
            nonce: epkNonce,
            identity_nullifier: this.id.identityNullifier,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            attester_id: this.attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti,
            timestamp,
            min_rep: minRep ?? 0,
            prove_graffiti: graffitiPreImage ? 1 : 0,
            graffiti_pre_image: graffitiPreImage ?? 0,
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
        } = {}
    ): Promise<EpochKeyProof> => {
        const nonce = options.nonce ?? 0
        const epoch = options.epoch ?? (await this.latestTransitionedEpoch())
        const tree = await this.genStateTree(epoch)
        const leafIndex = await this.latestStateTreeLeafIndex(epoch)
        const { posRep, negRep, graffiti, timestamp } =
            await this.getRepByAttester(this.attesterId, epoch)
        const proof = tree.createProof(leafIndex)
        const circuitInputs = {
            epoch,
            identity_nullifier: this.id.identityNullifier,
            attester_id: this.attesterId.toString(),
            nonce,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti,
            timestamp,
            data: options.data ?? BigInt(0),
            state_tree_elements: proof.siblings,
            state_tree_indexes: proof.pathIndices,
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
