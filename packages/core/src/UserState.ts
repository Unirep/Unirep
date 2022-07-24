import { BigNumber, ethers } from 'ethers'
import assert from 'assert'
import { DB } from 'anondb'
import {
    IncrementalMerkleTree,
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
    SignUpProof,
    UserTransitionProof,
    ProcessAttestationsProof,
    StartTransitionProof,
} from '@unirep/contracts'
import {
    defaultUserStateLeaf,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    computeInitUserStateRoot,
} from './utils'
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

    constructor(
        db: DB,
        prover: Prover,
        unirepContract: ethers.Contract,
        _id: ZkIdentity
    ) {
        super(db, prover, unirepContract)
        this.id = _id
    }

    async start() {
        await super.start()

        const [UserStateTransitioned] =
            this.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        this.on(UserStateTransitioned, async (event) => {
            const decodedData = this.unirepContract.interface.decodeEventLog(
                'UserStateTransitioned',
                event.data
            )
            const epoch = Number(event.topics[1])
            const GSTLeaf = BigInt(event.topics[2])
            const proofIndex = Number(decodedData.proofIndex)
            // get proof index data from db
            const proof = await this.loadUSTProof(proofIndex)
            if (!proof || !proof.valid) {
                console.log(`Proof index ${proofIndex} is invalid`)
            }
            const publicSignals = decodeBigIntArray(proof.publicSignals)
            const fromEpochIndex = 1 + this.settings.numEpochKeyNoncePerEpoch
            const fromGSTIndex = 4 + this.settings.numEpochKeyNoncePerEpoch
            const fromEpoch = Number(publicSignals[fromEpochIndex])
            const fromGST = publicSignals[fromGSTIndex]
            const tree = await this.genUserStateTree(epoch)
            if (GSTLeaf !== hashLeftRight(this.commitment, tree.root)) return
            try {
                await this.userStateTransition(fromEpoch, GSTLeaf, fromGST)
            } catch (err) {
                console.log(err)
            }
        })
    }

    /**
     * Query if the user is signed up in the unirep state.
     * @returns True if user has signed up in unirep contract, false otherwise.
     */
    async hasSignedUp(): Promise<boolean> {
        const signup = await this._db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
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
        const currentEpoch = await this.unirepContract.currentEpoch()
        let latestTransitionedEpoch = 1
        for (let x = currentEpoch; x > 0; x--) {
            const epkNullifier = genEpochKeyNullifier(
                this.id.identityNullifier,
                x,
                0
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
        if (latestTransitionedEpoch === 1) {
            const signup = await this._db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
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
        if (latestTransitionedEpoch === 1) {
            const signup = await this._db.findOne('UserSignUp', {
                where: {
                    commitment: this.commitment.toString(),
                },
            })
            if (!signup) {
                throw new Error('user is not signed up')
            }
            if (signup.epoch !== currentEpoch) {
                return 0
            }
            const leaf = hashLeftRight(
                this.commitment,
                computeInitUserStateRoot(
                    this.settings.userStateTreeDepth,
                    signup.attesterId,
                    signup.airdrop
                )
            )
            const foundLeaf = await this._db.findOne('GSTLeaf', {
                where: {
                    hash: leaf.toString(),
                },
            })
            if (!foundLeaf) return -1
            return foundLeaf.index
        }
        const USTree = await this.genUserStateTree(latestTransitionedEpoch)
        const leaf = hashLeftRight(this.commitment, USTree.root)
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
     * Computes the user state tree of given epoch
     */
    public genUserStateTree = async (
        beforeEpoch?: number
    ): Promise<SparseMerkleTree> => {
        const latestTransitionedEpoch = await this.latestTransitionedEpoch()
        const orConditions = [] as any
        for (let x = 1; x < (beforeEpoch ?? latestTransitionedEpoch); x++) {
            const epks = Array(this.settings.numEpochKeyNoncePerEpoch)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        this.id.identityNullifier,
                        x,
                        i,
                        this.settings.epochTreeDepth
                    ).toString()
                )
            orConditions.push({
                epochKey: epks,
                epoch: x,
            })
        }
        const attestations = await this._db.findMany('Attestation', {
            where: {
                OR: orConditions,
                valid: 1,
            },
            orderBy: {
                index: 'asc',
            },
        })
        const signup = await this._db.findOne('UserSignUp', {
            where: {
                commitment: this.commitment.toString(),
            },
        })
        if (!signup) throw new Error('User is not signed up')
        if (signup.attesterId > 0) {
            attestations.push({
                attesterId: signup.attesterId,
                posRep: signup.airdrop,
                negRep: 0,
                graffiti: 0,
                signUp: 1,
            })
        }
        const attestationsByAttesterId = attestations.reduce((acc, obj) => {
            return {
                ...acc,
                [obj.attesterId]: [...(acc[obj.attesterId] ?? []), obj],
            }
        }, {})
        const USTree = new SparseMerkleTree(
            this.settings.userStateTreeDepth,
            defaultUserStateLeaf
        )
        for (const attesterId of Object.keys(attestationsByAttesterId)) {
            const _attestations = attestationsByAttesterId[attesterId]
            const r = Reputation.default()
            for (const a of _attestations) {
                r.update(a.posRep, a.negRep, a.graffiti, a.signUp)
            }
            USTree.update(BigInt(attesterId), r.hash())
        }
        return USTree
    }

    /**
     * Proxy methods to get underlying UnirepState data
     */
    public getUnirepStateCurrentEpoch = async (): Promise<number> => {
        return (await this.loadCurrentEpoch()).number
    }

    async getNumGSTLeaves(epoch: number) {
        await this._checkValidEpoch(epoch)
        return this._db.count('GSTLeaf', {
            epoch: epoch,
        })
    }

    async getAttestations(epochKey: string): Promise<IAttestation[]> {
        await this._checkEpochKeyRange(epochKey)
        return this._db.findMany('Attestation', {
            where: {
                epochKey,
                valid: 1,
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
                    epoch,
                    i,
                    this.settings.epochTreeDepth
                )
            )
    }

    async loadUSTProof(index: number): Promise<any> {
        return this._db.findOne('Proof', {
            where: {
                event: 'IndexedUserStateTransitionProof',
                index,
                valid: 1,
            },
        })
    }

    public getUnirepStateEpochTree = async (epoch: number) => {
        return this.genEpochTree(epoch)
    }

    public getUnirepState = () => {
        return this
    }

    /**
     * Get the epoch key nullifier of given epoch
     */
    public getEpochKeyNullifiers = (epoch: number): BigInt[] => {
        const nullifiers: BigInt[] = []
        for (
            let nonce = 0;
            nonce < this.settings.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const nullifier = genEpochKeyNullifier(
                this.id.identityNullifier,
                epoch,
                nonce
            )
            nullifiers.push(nullifier)
        }
        return nullifiers
    }

    /**
     * Get the reputation object from a given attester
     * @param attesterId The attester ID that the user queries
     * @param toEpoch The latest epoch that the reputation is accumulated
     * @returns The reputation object
     */
    public getRepByAttester = async (
        attesterId: BigInt,
        toEpoch?: number
    ): Promise<IReputation> => {
        const r = Reputation.default()
        const signup = await this._db.findOne('UserSignUp', {
            where: {
                attesterId: Number(attesterId),
                commitment: this.commitment.toString(),
            },
        })
        if (signup && signup.attesterId > 0) {
            r.update(
                BigNumber.from(signup.airdrop),
                BigNumber.from(0),
                BigNumber.from(0),
                BigNumber.from(1)
            )
        }
        const allEpks = [] as string[]
        const latestTransitionedEpoch = await this.latestTransitionedEpoch()
        for (let x = 1; x < (toEpoch ?? latestTransitionedEpoch); x++) {
            const epks = Array(this.settings.numEpochKeyNoncePerEpoch)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        this.id.identityNullifier,
                        x,
                        i,
                        this.settings.epochTreeDepth
                    ).toString()
                )
            allEpks.push(...epks)
        }
        if (allEpks.length === 0) return r
        const attestations = await this._db.findMany('Attestation', {
            where: {
                epochKey: allEpks,
                attesterId: Number(attesterId),
                valid: 1,
            },
            orderBy: {
                index: 'asc',
            },
        })
        for (const a of attestations) {
            r.update(a.posRep, a.negRep, a.graffiti, a.signUp)
        }
        return r
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
     * Check if attester ID is valid
     */
    private _checkAttesterId = (attesterId: BigInt) => {
        assert(
            attesterId > BigInt(0),
            `UserState: attesterId must be greater than zero`
        )
        assert(
            attesterId < BigInt(2 ** this.settings.userStateTreeDepth),
            `UserState: attesterId exceeds total number of attesters`
        )
    }

    /**
     * Check if the root is one of the epoch tree roots in the given epoch
     */
    public epochTreeRootExists = async (
        epochTreeRoot: BigInt | string,
        epoch: number
    ): Promise<boolean> => {
        await this._checkValidEpoch(epoch)
        const found = await this._db.findOne('Epoch', {
            where: {
                number: epoch,
                epochRoot: epochTreeRoot.toString(),
            },
        })
        return !!found
    }

    /**
     * Update user state and unirep state according to user state transition event
     */
    public userStateTransition = async (
        fromEpoch: number,
        GSTLeaf: BigInt,
        fromGST: BigInt
    ) => {
        const latestTransitionedEpoch = await this.latestTransitionedEpoch()
        if (!this.hasSignedUp || latestTransitionedEpoch !== fromEpoch) return
        // better to check that the previous gst exists
        // await this._checkUserSignUp()

        const transitionToEpoch = (await this.loadCurrentEpoch()).number
        const newState = await this.genUserStateTree(transitionToEpoch)
        if (GSTLeaf !== newState.root) {
            console.error('UserState: new GST leaf mismatch')
            return
        }
        assert(
            fromEpoch < transitionToEpoch,
            'Can not transition to same epoch'
        )
    }

    /**
     * Generate the epoch key proof of the current user state.
     * @param epochKeyNonce The nonce that is used in the epoch key proof.
     * @returns The epoch key proof of type `EpochKeyProof`.
     */
    public genVerifyEpochKeyProof = async (
        epochKeyNonce: number
    ): Promise<EpochKeyProof> => {
        this._checkEpkNonce(epochKeyNonce)
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestGSTLeafIndex()
        const epochKey = genEpochKey(
            this.id.identityNullifier,
            epoch,
            epochKeyNonce,
            this.settings.epochTreeDepth
        )
        const userStateTree = await this.genUserStateTree(epoch)
        const GSTree = await this.genGSTree(epoch)
        const GSTProof = GSTree.createProof(leafIndex)

        const circuitInputs = stringifyBigInts({
            GST_path_elements: GSTProof.siblings,
            GST_path_index: GSTProof.pathIndices,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.root,
            nonce: epochKeyNonce,
            epoch: epoch,
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

    private _genStartTransitionCircuitInputs = async (
        fromNonce: number,
        userStateTreeRoot: BigInt,
        GSTreeProof: any,
        GSTreeRoot: BigInt
    ) => {
        const latestTransitionedEpoch = await this.latestTransitionedEpoch()
        // Circuit inputs
        const circuitInputs = stringifyBigInts({
            epoch: latestTransitionedEpoch,
            nonce: fromNonce,
            user_tree_root: userStateTreeRoot,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            GST_path_elements: GSTreeProof.siblings,
            GST_path_index: GSTreeProof.pathIndices,
        })

        // Circuit outputs
        // blinded user state and blinded hash chain are the inputs of processAttestationProofs
        const blindedUserState = hash5([
            this.id.identityNullifier,
            userStateTreeRoot,
            BigInt(latestTransitionedEpoch),
            BigInt(fromNonce),
            BigInt(0),
        ])
        const blindedHashChain = hash5([
            this.id.identityNullifier,
            BigInt(0), // hashchain starter
            BigInt(latestTransitionedEpoch),
            BigInt(fromNonce),
            BigInt(0),
        ])

        return {
            circuitInputs: circuitInputs,
            blindedUserState: blindedUserState,
            blindedHashChain: blindedHashChain,
        }
    }

    /**
     * Generate a set of user state transition proofs of the current user state
     * @returns A set of `StartTransitionProof`, `ProcessAttestationsProof` and `UserTransitionProof` that
     * is used to perform a user state transition.
     */
    public genUserStateTransitionProofs = async (): Promise<{
        startTransitionProof: StartTransitionProof
        processAttestationProofs: ProcessAttestationsProof[]
        finalTransitionProof: UserTransitionProof
    }> => {
        // don't need to check sign up because we won't be able to create a
        // gstree proof unless we are signed up
        // this._checkUserSignUp()
        const fromEpoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestGSTLeafIndex(fromEpoch)
        const fromNonce = 0

        // User state tree
        const fromEpochUserStateTree: SparseMerkleTree =
            await this.genUserStateTree(fromEpoch)
        const intermediateUserStateTreeRoots: BigInt[] = [
            fromEpochUserStateTree.root,
        ]
        const userStateLeafPathElements: any[] = []
        // GSTree
        const fromEpochGSTree: IncrementalMerkleTree = await this.genGSTree(
            fromEpoch
        )
        const GSTreeProof = fromEpochGSTree.createProof(leafIndex)
        const GSTreeRoot = fromEpochGSTree.root
        // Epoch tree
        const fromEpochTree = await this.genEpochTree(fromEpoch)
        const epochTreeRoot = fromEpochTree.root
        const epochKeyPathElements: any[] = []

        // start transition proof
        const startTransitionCircuitInputs =
            await this._genStartTransitionCircuitInputs(
                fromNonce,
                intermediateUserStateTreeRoots[0],
                GSTreeProof,
                GSTreeRoot
            )

        // process attestation proof
        const processAttestationCircuitInputs: any[] = []
        const fromNonces: number[] = [fromNonce]
        const toNonces: number[] = []
        const hashChainStarter: BigInt[] = []
        const blindedUserState: BigInt[] = [
            startTransitionCircuitInputs.blindedUserState,
        ]
        const blindedHashChain: BigInt[] = []
        let reputationRecords = {}
        const selectors: number[] = []
        const attesterIds: string[] = []
        const oldPosReps: string[] = [],
            oldNegReps: string[] = [],
            oldGraffities: string[] = [],
            oldSignUps: string[] = []
        const posReps: string[] = [],
            negReps: string[] = [],
            graffities: string[] = [],
            overwriteGraffities: any[] = [],
            signUps: string[] = []
        const finalBlindedUserState: BigInt[] = []
        const finalUserState: BigInt[] = [intermediateUserStateTreeRoots[0]]
        const finalHashChain: BigInt[] = []
        for (
            let nonce = 0;
            nonce < this.settings.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epochKey = genEpochKey(
                this.id.identityNullifier,
                fromEpoch,
                nonce,
                this.settings.epochTreeDepth
            )
            let currentHashChain: BigInt = BigInt(0)

            // Blinded user state and hash chain of the epoch key
            toNonces.push(nonce)
            hashChainStarter.push(currentHashChain)

            // Attestations
            const attestations = await this.getAttestations(epochKey.toString())
            // TODO: update attestation types
            for (let i = 0; i < attestations.length; i++) {
                // Include a blinded user state and blinded hash chain per proof
                if (
                    i &&
                    i % this.settings.numAttestationsPerProof == 0 &&
                    i != this.settings.numAttestationsPerProof - 1
                ) {
                    toNonces.push(nonce)
                    fromNonces.push(nonce)
                    hashChainStarter.push(currentHashChain)
                    blindedUserState.push(
                        hash5([
                            this.id.identityNullifier,
                            fromEpochUserStateTree.root,
                            BigInt(fromEpoch),
                            BigInt(nonce),
                            BigInt(0),
                        ])
                    )
                }

                const attestation = new Attestation(
                    attestations[i].attesterId,
                    attestations[i].posRep,
                    attestations[i].negRep,
                    attestations[i].graffiti,
                    attestations[i].signUp
                )
                const attesterId: BigInt = BigInt(
                    attestation.attesterId.toString()
                )
                const rep = await this.getRepByAttester(attesterId)

                if (reputationRecords[attesterId.toString()] === undefined) {
                    reputationRecords[attesterId.toString()] = new Reputation(
                        rep.posRep,
                        rep.negRep,
                        rep.graffiti,
                        rep.signUp
                    )
                }

                oldPosReps.push(reputationRecords[attesterId.toString()].posRep)
                oldNegReps.push(reputationRecords[attesterId.toString()].negRep)
                oldGraffities.push(
                    reputationRecords[attesterId.toString()].graffiti
                )
                oldSignUps.push(reputationRecords[attesterId.toString()].signUp)

                // Add UST merkle proof to the list
                const USTLeafPathElements =
                    fromEpochUserStateTree.createProof(attesterId)
                userStateLeafPathElements.push(USTLeafPathElements)

                // Update attestation record
                reputationRecords[attesterId.toString()].update(
                    attestation.posRep,
                    attestation.negRep,
                    attestation.graffiti,
                    attestation.signUp
                )

                // Update UST
                fromEpochUserStateTree.update(
                    attesterId,
                    reputationRecords[attesterId.toString()].hash()
                )
                // Add new UST root to intermediate UST roots
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.root)

                selectors.push(1)
                attesterIds.push(attesterId.toString())
                posReps.push(attestation.posRep.toString())
                negReps.push(attestation.negRep.toString())
                graffities.push(attestation.graffiti.toString())
                overwriteGraffities.push(attestation.graffiti.toString() != '0')
                signUps.push(attestation.signUp.toString())

                // Update current hashchain result
                currentHashChain = hashLeftRight(
                    attestation.hash(),
                    currentHashChain
                )
            }
            // Fill in blank data for non-exist attestation
            const filledAttestationNum = attestations.length
                ? Math.ceil(
                      attestations.length /
                          this.settings.numAttestationsPerProof
                  ) * this.settings.numAttestationsPerProof
                : this.settings.numAttestationsPerProof
            for (
                let i = 0;
                i < filledAttestationNum - attestations.length;
                i++
            ) {
                oldPosReps.push('0')
                oldNegReps.push('0')
                oldGraffities.push('0')
                oldSignUps.push('0')

                const USTLeafZeroPathElements =
                    fromEpochUserStateTree.createProof(BigInt(0))
                userStateLeafPathElements.push(USTLeafZeroPathElements)
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.root)

                selectors.push(0)
                attesterIds.push('0')
                posReps.push('0')
                negReps.push('0')
                graffities.push('0')
                overwriteGraffities.push('0')
                signUps.push('0')
            }
            epochKeyPathElements.push(fromEpochTree.createProof(epochKey))
            finalHashChain.push(currentHashChain)
            blindedUserState.push(
                hash5([
                    this.id.identityNullifier,
                    fromEpochUserStateTree.root,
                    BigInt(fromEpoch),
                    BigInt(nonce),
                    BigInt(0),
                ])
            )
            blindedHashChain.push(
                hash5([
                    this.id.identityNullifier,
                    currentHashChain,
                    BigInt(fromEpoch),
                    BigInt(nonce),
                    BigInt(0),
                ])
            )
            if (nonce != this.settings.numEpochKeyNoncePerEpoch - 1)
                fromNonces.push(nonce)
        }

        for (let i = 0; i < fromNonces.length; i++) {
            const startIdx = this.settings.numAttestationsPerProof * i
            const endIdx = this.settings.numAttestationsPerProof * (i + 1)
            processAttestationCircuitInputs.push(
                stringifyBigInts({
                    epoch: fromEpoch,
                    from_nonce: fromNonces[i],
                    to_nonce: toNonces[i],
                    identity_nullifier: this.id.identityNullifier,
                    intermediate_user_state_tree_roots:
                        intermediateUserStateTreeRoots.slice(
                            startIdx,
                            endIdx + 1
                        ),
                    old_pos_reps: oldPosReps.slice(startIdx, endIdx),
                    old_neg_reps: oldNegReps.slice(startIdx, endIdx),
                    old_graffities: oldGraffities.slice(startIdx, endIdx),
                    old_sign_ups: oldSignUps.slice(startIdx, endIdx),
                    path_elements: userStateLeafPathElements.slice(
                        startIdx,
                        endIdx
                    ),
                    attester_ids: attesterIds.slice(startIdx, endIdx),
                    pos_reps: posReps.slice(startIdx, endIdx),
                    neg_reps: negReps.slice(startIdx, endIdx),
                    graffities: graffities.slice(startIdx, endIdx),
                    overwrite_graffities: overwriteGraffities.slice(
                        startIdx,
                        endIdx
                    ),
                    sign_ups: signUps.slice(startIdx, endIdx),
                    selectors: selectors.slice(startIdx, endIdx),
                    hash_chain_starter: hashChainStarter[i],
                    input_blinded_user_state: blindedUserState[i],
                })
            )
        }

        // final user state transition proof
        const startEpochKeyNonce = 0
        const endEpochKeyNonce = this.settings.numEpochKeyNoncePerEpoch - 1
        finalUserState.push(fromEpochUserStateTree.root)
        finalBlindedUserState.push(
            hash5([
                this.id.identityNullifier,
                finalUserState[0],
                BigInt(fromEpoch),
                BigInt(startEpochKeyNonce),
                BigInt(0),
            ])
        )
        finalBlindedUserState.push(
            hash5([
                this.id.identityNullifier,
                finalUserState[1],
                BigInt(fromEpoch),
                BigInt(endEpochKeyNonce),
                BigInt(0),
            ])
        )
        const finalTransitionCircuitInputs = stringifyBigInts({
            epoch: fromEpoch,
            blinded_user_state: finalBlindedUserState,
            intermediate_user_state_tree_roots: finalUserState,
            start_epoch_key_nonce: startEpochKeyNonce,
            end_epoch_key_nonce: endEpochKeyNonce,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            GST_path_elements: GSTreeProof.siblings,
            GST_path_index: GSTreeProof.pathIndices,
            epk_path_elements: epochKeyPathElements,
            hash_chain_results: finalHashChain,
            blinded_hash_chain_results: blindedHashChain,
            epoch_tree_root: epochTreeRoot,
        })

        // Generate proofs
        const startTransitionresults =
            await this.prover.genProofAndPublicSignals(
                Circuit.startTransition,
                startTransitionCircuitInputs.circuitInputs
            )

        const processAttestationProofs: ProcessAttestationsProof[] = []
        for (let i = 0; i < processAttestationCircuitInputs.length; i++) {
            const results = await this.prover.genProofAndPublicSignals(
                Circuit.processAttestations,
                processAttestationCircuitInputs[i]
            )
            processAttestationProofs.push(
                new ProcessAttestationsProof(
                    results.publicSignals,
                    results.proof,
                    this.prover
                )
            )
        }

        const finalProofResults = await this.prover.genProofAndPublicSignals(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )

        return {
            startTransitionProof: new StartTransitionProof(
                startTransitionresults.publicSignals,
                startTransitionresults.proof,
                this.prover
            ),
            processAttestationProofs: processAttestationProofs,
            finalTransitionProof: new UserTransitionProof(
                finalProofResults.publicSignals,
                finalProofResults.proof,
                this.prover
            ),
        }
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
        attesterId: BigInt,
        epkNonce: number,
        minRep?: number,
        proveGraffiti?: BigInt,
        graffitiPreImage?: BigInt,
        spendAmount: BigInt | number = 0
    ): Promise<ReputationProof> => {
        this._checkEpkNonce(epkNonce)
        assert(
            spendAmount <= this.settings.maxReputationBudget,
            `Length of nonce list should be lte ${this.settings.maxReputationBudget}`
        )
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestGSTLeafIndex()
        const epochKey = genEpochKey(this.id.identityNullifier, epoch, epkNonce)
        const rep = await this.getRepByAttester(attesterId)
        const posRep = rep.posRep.toNumber()
        const negRep = rep.negRep.toNumber()
        const graffiti = rep.graffiti
        const signUp = rep.signUp.toNumber()
        const userStateTree = await this.genUserStateTree(epoch)
        const GSTree = await this.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(leafIndex)
        const USTPathElements = userStateTree.createProof(attesterId)

        // check if the nullifiers are submitted before
        let nonceStarter = -1
        // find valid nonce starter
        for (let n = 0; n < posRep - negRep; n++) {
            const reputationNullifier = genReputationNullifier(
                this.id.identityNullifier,
                epoch,
                n,
                attesterId
            )
            if (!(await this.nullifierExist(reputationNullifier))) {
                nonceStarter = n
                break
            }
        }
        assert(
            spendAmount == 0 || nonceStarter != -1,
            'All nullifiers are spent'
        )
        assert(
            nonceStarter + Number(spendAmount) <= posRep - negRep,
            'Not enough reputation to spend'
        )

        const circuitInputs = stringifyBigInts({
            epoch: epoch,
            epoch_key_nonce: epkNonce,
            epoch_key: epochKey,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.root,
            GST_path_index: GSTreeProof.pathIndices,
            GST_path_elements: GSTreeProof.siblings,
            attester_id: attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti: graffiti,
            sign_up: signUp,
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: spendAmount,
            start_rep_nonce: nonceStarter,
            min_rep: minRep === undefined ? 0 : minRep,
            prove_graffiti: proveGraffiti === undefined ? 0 : proveGraffiti,
            graffiti_pre_image:
                graffitiPreImage === undefined ? 0 : graffitiPreImage,
        })

        const results = await this.prover.genProofAndPublicSignals(
            Circuit.proveReputation,
            circuitInputs
        )

        return new ReputationProof(
            results.publicSignals,
            results.proof,
            this.prover,
            this.settings.maxReputationBudget
        )
    }

    /**
     * Generate a user sign up proof of current user state and the given attester ID
     * @param attesterId The attester ID that the user wants to prove the sign up status
     * @returns The sign up proof of type `SignUpProof`.
     */
    public genUserSignUpProof = async (
        attesterId: BigInt
    ): Promise<SignUpProof> => {
        await this._checkUserSignUp()
        this._checkAttesterId(attesterId)
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestGSTLeafIndex()
        const rep = await this.getRepByAttester(attesterId)
        const posRep = rep.posRep
        const negRep = rep.negRep
        const graffiti = rep.graffiti
        const signUp = rep.signUp
        const userStateTree = await this.genUserStateTree(epoch)
        const GSTree = await this.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(leafIndex)
        const USTPathElements = userStateTree.createProof(attesterId)

        const circuitInputs = stringifyBigInts({
            epoch: epoch,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.root,
            GST_path_index: GSTreeProof.pathIndices,
            GST_path_elements: GSTreeProof.siblings,
            attester_id: attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti: graffiti,
            sign_up: signUp,
            UST_path_elements: USTPathElements,
        })
        const results = await this.prover.genProofAndPublicSignals(
            Circuit.proveUserSignUp,
            circuitInputs
        )

        return new SignUpProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }
}

export { Reputation, UserState }
