import { BigNumber } from 'ethers'
import assert from 'assert'
import {
    IncrementalMerkleTree,
    hash5,
    stringifyBigInts,
    hashLeftRight,
    SparseMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'
import { Circuit, genProofAndPublicSignals } from '@unirep/circuits'
import { IAttestation, Attestation } from '@unirep/contracts'

import {
    defaultUserStateLeaf,
    genEpochKey,
    genNewSMT,
    genEpochKeyNullifier,
    genReputationNullifier,
} from './utils'
import { IReputation, IUserState, IUserStateLeaf } from './interfaces'
import Reputation from './Reputation'
import UnirepState from './UnirepState'
import { NUM_ATTESTATIONS_PER_PROOF } from '@unirep/circuits/config'

export default class UserState {
    public userStateTreeDepth: number
    public numEpochKeyNoncePerEpoch: number
    public numAttestationsPerProof: number
    public maxReputationBudget: number

    private unirepState: UnirepState

    public id: ZkIdentity
    public commitment: bigint
    private hasSignedUp: boolean = false

    public latestTransitionedEpoch: number // Latest epoch where the user has a record in the GST of that epoch
    public latestGSTLeafIndex: number // Leaf index of the latest GST where the user has a record in
    private latestUserStateLeaves: IUserStateLeaf[] // Latest non-default user state leaves
    private transitionedFromAttestations: { [key: string]: IAttestation[] } = {} // attestations in the latestTransitionedEpoch

    constructor(
        _unirepState: UnirepState,
        _id: ZkIdentity,
        _hasSignedUp?: boolean,
        _latestTransitionedEpoch?: number,
        _latestGSTLeafIndex?: number,
        _latestUserStateLeaves?: IUserStateLeaf[],
        _transitionedFromAttestations?: { [key: string]: IAttestation[] }
    ) {
        assert(
            _unirepState !== undefined,
            'UserState: UnirepState is undefined'
        )
        this.unirepState = _unirepState
        this.userStateTreeDepth = this.unirepState.settings.userStateTreeDepth
        this.numEpochKeyNoncePerEpoch =
            this.unirepState.settings.numEpochKeyNoncePerEpoch
        this.numAttestationsPerProof = NUM_ATTESTATIONS_PER_PROOF
        this.maxReputationBudget = this.unirepState.settings.maxReputationBudget

        this.id = _id
        this.commitment = this.id.genIdentityCommitment()
        this.latestUserStateLeaves = []

        if (_hasSignedUp !== undefined) {
            assert(
                _latestTransitionedEpoch !== undefined,
                'UserState: User has signed up but missing latestTransitionedEpoch'
            )
            assert(
                _latestGSTLeafIndex !== undefined,
                'UserState: User has signed up but missing latestGSTLeafIndex'
            )

            this.latestTransitionedEpoch = _latestTransitionedEpoch
            this.latestGSTLeafIndex = _latestGSTLeafIndex
            if (_latestUserStateLeaves !== undefined)
                this.latestUserStateLeaves = _latestUserStateLeaves
            if (_transitionedFromAttestations !== undefined)
                this.transitionedFromAttestations =
                    _transitionedFromAttestations
            this.hasSignedUp = _hasSignedUp
        } else {
            this.latestTransitionedEpoch = 0
            this.latestGSTLeafIndex = 0
        }
    }

    public toJSON = (): IUserState => {
        const userStateLeavesMapToString: { [key: string]: string } = {}
        for (const l of this.latestUserStateLeaves) {
            userStateLeavesMapToString[l.attesterId.toString()] =
                l.reputation.toJSON()
        }
        const transitionedFromAttestationsToString: {
            [key: string]: string[]
        } = {}
        const epoch = this.latestTransitionedEpoch
        for (
            let nonce = 0;
            nonce < this.unirepState.settings.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epk = genEpochKey(
                this.id.identityNullifier,
                epoch,
                nonce
            ).toString()
            const attestations = this.transitionedFromAttestations[epk]
            if (attestations !== undefined)
                transitionedFromAttestationsToString[epk] = attestations.map(
                    (a: any) => JSON.stringify(a)
                )
        }
        return {
            idNullifier: this.id.identityNullifier,
            idCommitment: this.commitment,
            hasSignedUp: this.hasSignedUp,
            latestTransitionedEpoch: this.latestTransitionedEpoch,
            latestGSTLeafIndex: this.latestGSTLeafIndex,
            latestUserStateLeaves: userStateLeavesMapToString,
            transitionedFromAttestations: transitionedFromAttestationsToString,
            unirepState: this.unirepState.toJSON(),
        }
    }

    public static fromJSON = (identity: ZkIdentity, data: IUserState) => {
        const _userState = typeof data === 'string' ? JSON.parse(data) : data
        const unirepState = UnirepState.fromJSON(_userState.unirepState)
        const userStateLeaves: IUserStateLeaf[] = []
        const transitionedFromAttestations: { [key: string]: IAttestation[] } =
            {}
        for (const key in _userState.latestUserStateLeaves) {
            const parsedLeaf = JSON.parse(_userState.latestUserStateLeaves[key])
            const leaf: IUserStateLeaf = {
                attesterId: BigInt(key),
                reputation: new Reputation(
                    parsedLeaf.posRep,
                    parsedLeaf.negRep,
                    parsedLeaf.graffiti,
                    parsedLeaf.signUp
                ),
            }
            userStateLeaves.push(leaf)
        }
        for (const key in _userState.transitionedFromAttestations) {
            transitionedFromAttestations[key] = []
            for (const attest of _userState.transitionedFromAttestations[key]) {
                const parsedAttest = JSON.parse(attest)
                const attestation: IAttestation = new Attestation(
                    parsedAttest.attesterId,
                    parsedAttest.posRep,
                    parsedAttest.negRep,
                    parsedAttest.graffiti,
                    parsedAttest.signUp
                )
                transitionedFromAttestations[key].push(attestation)
            }
        }
        const userState = new this(
            unirepState,
            identity,
            _userState.hasSignedUp,
            _userState.latestTransitionedEpoch,
            _userState.latestGSTLeafIndex,
            userStateLeaves,
            transitionedFromAttestations
        )
        return userState
    }

    /**
     * Proxy methods to get underlying UnirepState data
     */
    public getUnirepStateCurrentEpoch = (): number => {
        return this.unirepState.currentEpoch
    }

    public getUnirepStateGSTree = (epoch: number): IncrementalMerkleTree => {
        return this.unirepState.genGSTree(epoch)
    }

    public getUnirepStateEpochTree = async (epoch: number) => {
        return this.unirepState.genEpochTree(epoch)
    }

    public getUnirepState = () => {
        return this.unirepState
    }

    /**
     * Get the attestations of given epoch key
     */
    public getAttestations = (epochKey: string): IAttestation[] => {
        return this.unirepState.getAttestations(epochKey)
    }

    public addAttestation = (
        epochKey: string,
        attestation: IAttestation,
        blockNumber?: number
    ) => {
        this.unirepState.addAttestation(epochKey, attestation, blockNumber)
    }

    public addReputationNullifiers = (
        nullifier: bigint,
        blockNumber?: number
    ) => {
        this.unirepState.addReputationNullifiers(nullifier, blockNumber)
    }

    /**
     * Get the epoch key nullifier of given epoch
     */
    public getEpochKeyNullifiers = (epoch: number): bigint[] => {
        const nullifiers: bigint[] = []
        for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
            const nullifier = genEpochKeyNullifier(
                this.id.identityNullifier,
                epoch,
                nonce
            )
            nullifiers.push(nullifier)
        }
        return nullifiers
    }

    public getRepByAttester = (attesterId: bigint): IReputation => {
        const leaf = this.latestUserStateLeaves.find(
            (leaf) => leaf.attesterId == attesterId
        )
        if (leaf !== undefined) return leaf.reputation
        else return Reputation.default()
    }

    /**
     * Check if given nullifier exists in nullifier tree
     */
    public nullifierExist = (nullifier: bigint): boolean => {
        return this.unirepState.nullifierExist(nullifier)
    }

    /**
     * Check if user has signed up in Unirep
     */
    private _checkUserSignUp = () => {
        assert(this.hasSignedUp, 'UserState: User has not signed up yet')
    }

    /**
     * Check if user has not signed up in Unirep
     */
    private _checkUserNotSignUp = () => {
        assert(!this.hasSignedUp, 'UserState: User has already signed up')
    }

    /**
     * Check if epoch key nonce is valid
     */
    private _checkEpkNonce = (epochKeyNonce: number) => {
        assert(
            epochKeyNonce < this.numEpochKeyNoncePerEpoch,
            `epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
        )
    }

    /**
     * Check if attester ID is valid
     */
    private _checkAttesterId = (attesterId: bigint) => {
        assert(
            attesterId > BigInt(0),
            `UserState: attesterId must be greater than zero`
        )
        assert(
            attesterId < BigInt(2 ** this.userStateTreeDepth),
            `UserState: attesterId exceeds total number of attesters`
        )
    }

    /**
     * Add a new epoch key to the list of epoch key of current epoch.
     */
    public signUp = async (
        epoch: number,
        identityCommitment: bigint,
        attesterId?: number,
        airdropAmount?: number,
        blockNumber?: number
    ) => {
        // update unirep state
        await this.unirepState.signUp(
            epoch,
            identityCommitment,
            attesterId,
            airdropAmount,
            blockNumber
        )

        // if commitment matches the user's commitment, update user state
        if (identityCommitment === this.commitment) {
            this._checkUserNotSignUp()

            const signUpInLeaf = 1
            if (attesterId && airdropAmount) {
                const stateLeave: IUserStateLeaf = {
                    attesterId: BigInt(attesterId),
                    reputation: Reputation.default().update(
                        BigNumber.from(airdropAmount),
                        BigNumber.from(0),
                        BigNumber.from(0),
                        BigNumber.from(signUpInLeaf)
                    ),
                }
                this.latestUserStateLeaves = [stateLeave]
            }
            this.latestTransitionedEpoch = epoch
            this.latestGSTLeafIndex =
                this.unirepState.getNumGSTLeaves(epoch) - 1
            this.hasSignedUp = true
        }
    }

    /**
     * Computes the user state tree with given state leaves
     */
    private _genUserStateTreeFromLeaves = async (
        leaves: IUserStateLeaf[]
    ): Promise<SparseMerkleTree> => {
        const USTree = await genNewSMT(
            this.userStateTreeDepth,
            defaultUserStateLeaf
        )

        for (const leaf of leaves) {
            await USTree.update(leaf.attesterId, leaf.reputation.hash())
        }
        return USTree
    }

    /**
     * Computes the user state tree of given epoch
     */
    public genUserStateTree = async (): Promise<SparseMerkleTree> => {
        const leaves = this.latestUserStateLeaves
        return await this._genUserStateTreeFromLeaves(leaves)
    }

    /**
     * Check if the root is one of the Global state tree roots in the given epoch
     */
    public GSTRootExists = (
        GSTRoot: bigint | string,
        epoch: number
    ): boolean => {
        return this.unirepState.GSTRootExists(GSTRoot, epoch)
    }

    /**
     * Check if the root is one of the epoch tree roots in the given epoch
     */
    public epochTreeRootExists = async (
        epochTreeRoot: bigint | string,
        epoch: number
    ): Promise<boolean> => {
        return this.unirepState.epochTreeRootExists(epochTreeRoot, epoch)
    }

    /**
     * Update user state and unirep state according to user state transition event
     */
    public userStateTransition = async (
        fromEpoch: number,
        GSTLeaf: bigint,
        nullifiers: bigint[],
        blockNumber?: number
    ) => {
        if (this.hasSignedUp && this.latestTransitionedEpoch === fromEpoch) {
            // Latest epoch user transitioned to ends. Generate nullifiers of all epoch key
            const userEpkNullifiers = this.getEpochKeyNullifiers(fromEpoch)
            let epkNullifiersMatched = 0
            for (const nullifier of userEpkNullifiers) {
                if (nullifiers.indexOf(nullifier) !== -1) epkNullifiersMatched++
            }

            // Here we assume all epoch keys are processed in the same epoch. If this assumption does not
            // stand anymore, below `epkNullifiersMatched` check should be changed.
            if (epkNullifiersMatched == this.numEpochKeyNoncePerEpoch) {
                await this._transition(GSTLeaf)
            } else if (epkNullifiersMatched > 0) {
                console.error(
                    `Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${this.numEpochKeyNoncePerEpoch}`
                )
                return
            }
        }

        this.unirepState.userStateTransition(
            fromEpoch,
            GSTLeaf,
            nullifiers,
            blockNumber
        )
    }

    public genVerifyEpochKeyProof = async (epochKeyNonce: number) => {
        this._checkUserSignUp()
        this._checkEpkNonce(epochKeyNonce)
        const epoch = this.latestTransitionedEpoch
        const epochKey = genEpochKey(
            this.id.identityNullifier,
            epoch,
            epochKeyNonce,
            this.unirepState.settings.epochTreeDepth
        )
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.unirepState.genGSTree(epoch)
        const GSTProof = GSTree.createProof(this.latestGSTLeafIndex)

        const circuitInputs = stringifyBigInts({
            GST_path_elements: GSTProof.siblings,
            GST_path_index: GSTProof.pathIndices,
            GST_root: GSTree.root,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.root,
            nonce: epochKeyNonce,
            epoch: epoch,
            epoch_key: epochKey,
        })

        const results = await genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            circuitInputs
        )

        return {
            proof: results.proof,
            publicSignals: results.publicSignals,
            globalStateTree: results.publicSignals[0],
            epoch: results.publicSignals[1],
            epochKey: results.publicSignals[2],
        }
    }

    private _updateUserStateLeaf = (
        attestation: IAttestation,
        stateLeaves: IUserStateLeaf[]
    ): IUserStateLeaf[] => {
        const attesterId = attestation.attesterId.toBigInt()
        for (const leaf of stateLeaves) {
            if (leaf.attesterId === attesterId) {
                leaf.reputation = leaf.reputation.update(
                    attestation.posRep,
                    attestation.negRep,
                    attestation.graffiti,
                    attestation.signUp
                )
                return stateLeaves
            }
        }
        // If no matching state leaf, insert new one
        const newLeaf: IUserStateLeaf = {
            attesterId: attesterId,
            reputation: Reputation.default().update(
                attestation.posRep,
                attestation.negRep,
                attestation.graffiti,
                attestation.signUp
            ),
        }
        stateLeaves.push(newLeaf)
        return stateLeaves
    }

    private _saveAttestations = () => {
        this._checkUserSignUp()
        const fromEpoch = this.latestTransitionedEpoch

        for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
            const epochKey = genEpochKey(
                this.id.identityNullifier,
                fromEpoch,
                nonce,
                this.unirepState.settings.epochTreeDepth
            ).toString()
            const attestations = this.unirepState.getAttestations(epochKey)
            this.transitionedFromAttestations[epochKey] = attestations
        }
    }

    public epochTransition = async (epoch: number, blockNumber?: number) => {
        await this.unirepState.epochTransition(epoch, blockNumber)
        if (epoch === this.latestTransitionedEpoch) {
            // save latest attestations in user state
            this._saveAttestations()
        }
    }

    private _genNewUserStateAfterTransition = async () => {
        this._checkUserSignUp()
        const fromEpoch = this.latestTransitionedEpoch

        let stateLeaves: IUserStateLeaf[]
        stateLeaves = this.latestUserStateLeaves.slice()

        for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
            const epkNullifier = genEpochKeyNullifier(
                this.id.identityNullifier,
                fromEpoch,
                nonce
            )
            assert(
                !this.unirepState.nullifierExist(epkNullifier),
                `Epoch key with nonce ${nonce} is already processed, it's nullifier: ${epkNullifier}`
            )

            const epochKey = genEpochKey(
                this.id.identityNullifier,
                fromEpoch,
                nonce,
                this.unirepState.settings.epochTreeDepth
            ).toString()
            const attestations = this.transitionedFromAttestations[epochKey]
            for (let i = 0; i < attestations?.length; i++) {
                const attestation = attestations[i]
                stateLeaves = this._updateUserStateLeaf(
                    attestation,
                    stateLeaves
                )
            }
        }

        // Gen new user state tree
        const newUserStateTree = await this._genUserStateTreeFromLeaves(
            stateLeaves
        )

        // Gen new GST leaf
        const newGSTLeaf = hashLeftRight(this.commitment, newUserStateTree.root)
        return {
            newGSTLeaf: newGSTLeaf,
            newUSTLeaves: stateLeaves,
        }
    }

    private _genStartTransitionCircuitInputs = async (
        fromNonce: number,
        userStateTreeRoot: bigint,
        GSTreeProof: any,
        GSTreeRoot: bigint
    ) => {
        // Circuit inputs
        const circuitInputs = stringifyBigInts({
            epoch: this.latestTransitionedEpoch,
            nonce: fromNonce,
            user_tree_root: userStateTreeRoot,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            GST_path_elements: GSTreeProof.siblings,
            GST_path_index: GSTreeProof.pathIndices,
            GST_root: GSTreeRoot,
        })

        // Circuit outputs
        // blinded user state and blinded hash chain are the inputs of processAttestationProofs
        const blindedUserState = hash5([
            this.id.identityNullifier,
            userStateTreeRoot,
            BigInt(this.latestTransitionedEpoch),
            BigInt(fromNonce),
            BigInt(0),
        ])
        const blindedHashChain = hash5([
            this.id.identityNullifier,
            BigInt(0), // hashchain starter
            BigInt(this.latestTransitionedEpoch),
            BigInt(fromNonce),
            BigInt(0),
        ])

        return {
            circuitInputs: circuitInputs,
            blindedUserState: blindedUserState,
            blindedHashChain: blindedHashChain,
        }
    }

    public genUserStateTransitionProofs = async () => {
        this._checkUserSignUp()
        const fromEpoch = this.latestTransitionedEpoch
        const fromNonce = 0

        // User state tree
        const fromEpochUserStateTree: SparseMerkleTree =
            await this.genUserStateTree()
        const intermediateUserStateTreeRoots: bigint[] = [
            fromEpochUserStateTree.root,
        ]
        const userStateLeafPathElements: any[] = []
        // GSTree
        const fromEpochGSTree: IncrementalMerkleTree =
            this.unirepState.genGSTree(fromEpoch)
        const GSTreeProof = fromEpochGSTree.createProof(this.latestGSTLeafIndex)
        const GSTreeRoot = fromEpochGSTree.root
        // Epoch tree
        const fromEpochTree = await this.unirepState.genEpochTree(fromEpoch)
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
        const hashChainStarter: bigint[] = []
        const blindedUserState: bigint[] = [
            startTransitionCircuitInputs.blindedUserState,
        ]
        const blindedHashChain: bigint[] = []
        let reputationRecords = {}
        const selectors: number[] = []
        const attesterIds: bigint[] = []
        const oldPosReps: bigint[] = [],
            oldNegReps: bigint[] = [],
            oldGraffities: bigint[] = [],
            oldSignUps: bigint[] = []
        const posReps: bigint[] = [],
            negReps: bigint[] = [],
            graffities: bigint[] = [],
            overwriteGraffities: any[] = [],
            signUps: bigint[] = []
        const finalBlindedUserState: bigint[] = []
        const finalUserState: bigint[] = [intermediateUserStateTreeRoots[0]]
        const finalHashChain: bigint[] = []

        for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
            const epochKey = genEpochKey(
                this.id.identityNullifier,
                fromEpoch,
                nonce,
                this.unirepState.settings.epochTreeDepth
            )
            let currentHashChain: bigint = BigInt(0)

            // Blinded user state and hash chain of the epoch key
            toNonces.push(nonce)
            hashChainStarter.push(currentHashChain)

            // Attestations
            const attestations = this.unirepState.getAttestations(
                epochKey.toString()
            )
            for (let i = 0; i < attestations.length; i++) {
                // Include a blinded user state and blinded hash chain per proof
                if (
                    i &&
                    i % this.numAttestationsPerProof == 0 &&
                    i != this.numAttestationsPerProof - 1
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
                        ])
                    )
                }

                const attestation = attestations[i]
                const attesterId: bigint = attestation.attesterId.toBigInt()
                const rep = this.getRepByAttester(attesterId)

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
                    await fromEpochUserStateTree.createProof(attesterId)
                userStateLeafPathElements.push(USTLeafPathElements)

                // Update attestation record
                reputationRecords[attesterId.toString()].update(
                    attestation.posRep,
                    attestation.negRep,
                    attestation.graffiti,
                    attestation.signUp
                )

                // Update UST
                await fromEpochUserStateTree.update(
                    attesterId,
                    reputationRecords[attesterId.toString()].hash()
                )
                // Add new UST root to intermediate UST roots
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.root)

                selectors.push(1)
                attesterIds.push(attesterId)
                posReps.push(attestation.posRep.toBigInt())
                negReps.push(attestation.negRep.toBigInt())
                graffities.push(attestation.graffiti.toBigInt())
                overwriteGraffities.push(
                    attestation.graffiti.toBigInt() != BigInt(0)
                )
                signUps.push(attestation.signUp.toBigInt())

                // Update current hashchain result
                const attestationHash = attestation.hash()
                currentHashChain = hashLeftRight(
                    attestationHash,
                    currentHashChain
                )
            }
            // Fill in blank data for non-exist attestation
            const filledAttestationNum = attestations.length
                ? Math.ceil(
                      attestations.length / this.numAttestationsPerProof
                  ) * this.numAttestationsPerProof
                : this.numAttestationsPerProof
            for (
                let i = 0;
                i < filledAttestationNum - attestations.length;
                i++
            ) {
                oldPosReps.push(BigInt(0))
                oldNegReps.push(BigInt(0))
                oldGraffities.push(BigInt(0))
                oldSignUps.push(BigInt(0))

                const USTLeafZeroPathElements =
                    await fromEpochUserStateTree.createProof(BigInt(0))
                userStateLeafPathElements.push(USTLeafZeroPathElements)
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.root)

                selectors.push(0)
                attesterIds.push(BigInt(0))
                posReps.push(BigInt(0))
                negReps.push(BigInt(0))
                graffities.push(BigInt(0))
                overwriteGraffities.push(BigInt(0))
                signUps.push(BigInt(0))
            }
            epochKeyPathElements.push(await fromEpochTree.createProof(epochKey))
            // finalUserState.push(fromEpochUserStateTree.root)
            finalHashChain.push(currentHashChain)
            blindedUserState.push(
                hash5([
                    this.id.identityNullifier,
                    fromEpochUserStateTree.root,
                    BigInt(fromEpoch),
                    BigInt(nonce),
                ])
            )
            blindedHashChain.push(
                hash5([
                    this.id.identityNullifier,
                    currentHashChain,
                    BigInt(fromEpoch),
                    BigInt(nonce),
                ])
            )
            if (nonce != this.numEpochKeyNoncePerEpoch - 1)
                fromNonces.push(nonce)
        }

        for (let i = 0; i < fromNonces.length; i++) {
            const startIdx = this.numAttestationsPerProof * i
            const endIdx = this.numAttestationsPerProof * (i + 1)
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
        const endEpochKeyNonce = this.numEpochKeyNoncePerEpoch - 1
        finalUserState.push(fromEpochUserStateTree.root)
        finalBlindedUserState.push(
            hash5([
                this.id.identityNullifier,
                finalUserState[0],
                BigInt(fromEpoch),
                BigInt(startEpochKeyNonce),
            ])
        )
        finalBlindedUserState.push(
            hash5([
                this.id.identityNullifier,
                finalUserState[1],
                BigInt(fromEpoch),
                BigInt(endEpochKeyNonce),
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
            GST_root: GSTreeRoot,
            epk_path_elements: epochKeyPathElements,
            hash_chain_results: finalHashChain,
            blinded_hash_chain_results: blindedHashChain,
            epoch_tree_root: epochTreeRoot,
        })

        // Generate proofs
        const startTransitionresults = await genProofAndPublicSignals(
            Circuit.startTransition,
            startTransitionCircuitInputs.circuitInputs
        )

        const processAttestationProofs: any[] = []
        for (let i = 0; i < processAttestationCircuitInputs.length; i++) {
            const results = await genProofAndPublicSignals(
                Circuit.processAttestations,
                processAttestationCircuitInputs[i]
            )
            processAttestationProofs.push({
                proof: results.proof,
                publicSignals: results.publicSignals,
                outputBlindedUserState: results.publicSignals[0],
                outputBlindedHashChain: results.publicSignals[1],
                inputBlindedUserState: results.publicSignals[2],
            })
        }

        const finalProofResults = await genProofAndPublicSignals(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )

        return {
            startTransitionProof: {
                proof: startTransitionresults.proof,
                publicSignals: startTransitionresults.publicSignals,
                blindedUserState: startTransitionresults.publicSignals[0],
                blindedHashChain: startTransitionresults.publicSignals[1],
                globalStateTreeRoot: startTransitionresults.publicSignals[2],
            },
            processAttestationProofs: processAttestationProofs,
            finalTransitionProof: {
                proof: finalProofResults.proof,
                publicSignals: finalProofResults.publicSignals,
                newGlobalStateTreeLeaf: finalProofResults.publicSignals[0],
                epochKeyNullifiers: finalProofResults.publicSignals.slice(
                    1,
                    1 + this.numEpochKeyNoncePerEpoch
                ),
                transitionedFromEpoch:
                    finalProofResults.publicSignals[
                        1 + this.numEpochKeyNoncePerEpoch
                    ],
                blindedUserStates: finalProofResults.publicSignals.slice(
                    2 + this.numEpochKeyNoncePerEpoch,
                    4 + this.numEpochKeyNoncePerEpoch
                ),
                fromGSTRoot:
                    finalProofResults.publicSignals[
                        4 + this.numEpochKeyNoncePerEpoch
                    ],
                blindedHashChains: finalProofResults.publicSignals.slice(
                    5 + this.numEpochKeyNoncePerEpoch,
                    5 + 2 * this.numEpochKeyNoncePerEpoch
                ),
                fromEpochTree:
                    finalProofResults.publicSignals[
                        5 + 2 * this.numEpochKeyNoncePerEpoch
                    ],
            },
        }
    }

    /**
     * Update transition data including latest transition epoch, GST leaf index and user state tree leaves.
     */
    private _transition = async (newLeaf: bigint) => {
        this._checkUserSignUp()

        const fromEpoch = this.latestTransitionedEpoch
        const transitionToEpoch = this.unirepState.currentEpoch
        const transitionToGSTIndex =
            this.unirepState.getNumGSTLeaves(transitionToEpoch)
        const newState = await this._genNewUserStateAfterTransition()
        if (newLeaf !== newState.newGSTLeaf) {
            console.error('UserState: new GST leaf mismatch')
            return
        }
        const latestStateLeaves = newState.newUSTLeaves
        assert(
            fromEpoch < transitionToEpoch,
            'Can not transition to same epoch'
        )

        this.latestTransitionedEpoch = transitionToEpoch
        this.latestGSTLeafIndex = transitionToGSTIndex

        // Update user state leaves
        this.latestUserStateLeaves = latestStateLeaves.slice()
    }

    public genProveReputationProof = async (
        attesterId: bigint,
        epkNonce: number,
        minRep?: number,
        proveGraffiti?: bigint,
        graffitiPreImage?: bigint,
        nonceList?: bigint[]
    ) => {
        this._checkUserSignUp()
        this._checkEpkNonce(epkNonce)

        if (nonceList == undefined)
            nonceList = new Array(
                this.unirepState.settings.maxReputationBudget
            ).fill(BigInt(-1))
        assert(
            nonceList.length == this.unirepState.settings.maxReputationBudget,
            `Length of nonce list should be ${this.unirepState.settings.maxReputationBudget}`
        )
        const epoch = this.latestTransitionedEpoch
        const epochKey = genEpochKey(this.id.identityNullifier, epoch, epkNonce)
        const rep = this.getRepByAttester(attesterId)
        const posRep = rep.posRep
        const negRep = rep.negRep
        const graffiti = rep.graffiti
        const signUp = rep.signUp
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.unirepState.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(this.latestGSTLeafIndex)
        const GSTreeRoot = GSTree.root
        const USTPathElements = await userStateTree.createProof(attesterId)
        const selectors: bigint[] = []
        const nonceExist = {}
        let repNullifiersAmount = 0
        for (
            let i = 0;
            i < this.unirepState.settings.maxReputationBudget;
            i++
        ) {
            if (nonceList[i] !== BigInt(-1)) {
                assert(
                    nonceExist[nonceList[i].toString()] == undefined,
                    'cannot submit duplicated nonce to compute reputation nullifiers'
                )
                repNullifiersAmount++
                selectors[i] = BigInt(1)
                nonceExist[nonceList[i].toString()] = 1
            } else {
                selectors[i] = BigInt(0)
            }
        }

        // check if the nullifiers are submitted before
        let nonceStarter = -1
        if (repNullifiersAmount > 0) {
            // find valid nonce starter
            for (let n = 0; n < Number(posRep) - Number(negRep); n++) {
                const reputationNullifier = genReputationNullifier(
                    this.id.identityNullifier,
                    epoch,
                    n,
                    attesterId
                )
                if (!this.unirepState.nullifierExist(reputationNullifier)) {
                    nonceStarter = n
                    break
                }
            }
            assert(nonceStarter != -1, 'All nullifiers are spent')
            assert(
                nonceStarter + repNullifiersAmount <=
                    Number(posRep) - Number(negRep),
                'Not enough reputation to spend'
            )
        }

        const circuitInputs = stringifyBigInts({
            epoch: epoch,
            epoch_key_nonce: epkNonce,
            epoch_key: epochKey,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.root,
            GST_path_index: GSTreeProof.pathIndices,
            GST_path_elements: GSTreeProof.siblings,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti: graffiti,
            sign_up: signUp,
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: minRep === undefined ? 0 : minRep,
            prove_graffiti: proveGraffiti === undefined ? 0 : proveGraffiti,
            graffiti_pre_image:
                graffitiPreImage === undefined ? 0 : graffitiPreImage,
        })

        const results = await genProofAndPublicSignals(
            Circuit.proveReputation,
            circuitInputs
        )

        return {
            proof: results['proof'],
            publicSignals: results['publicSignals'],
            reputationNullifiers: results['publicSignals'].slice(
                0,
                this.maxReputationBudget
            ),
            epoch: results['publicSignals'][this.maxReputationBudget],
            epochKey: results['publicSignals'][this.maxReputationBudget + 1],
            globalStatetreeRoot:
                results['publicSignals'][this.maxReputationBudget + 2],
            attesterId: results['publicSignals'][this.maxReputationBudget + 3],
            proveReputationAmount:
                results['publicSignals'][this.maxReputationBudget + 4],
            minRep: results['publicSignals'][this.maxReputationBudget + 5],
            proveGraffiti:
                results['publicSignals'][this.maxReputationBudget + 6],
            graffitiPreImage:
                results['publicSignals'][this.maxReputationBudget + 7],
        }
    }

    public genUserSignUpProof = async (attesterId: bigint) => {
        this._checkUserSignUp()
        this._checkAttesterId(attesterId)
        const epoch = this.latestTransitionedEpoch
        const nonce = 0 // fixed epk nonce
        const epochKey = genEpochKey(this.id.identityNullifier, epoch, nonce)
        const rep = this.getRepByAttester(attesterId)
        const posRep = rep.posRep
        const negRep = rep.negRep
        const graffiti = rep.graffiti
        const signUp = rep.signUp
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.unirepState.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(this.latestGSTLeafIndex)
        const GSTreeRoot = GSTree.root
        const USTPathElements = await userStateTree.createProof(attesterId)

        const circuitInputs = stringifyBigInts({
            epoch: epoch,
            epoch_key: epochKey,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.root,
            GST_path_index: GSTreeProof.pathIndices,
            GST_path_elements: GSTreeProof.siblings,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti: graffiti,
            sign_up: signUp,
            UST_path_elements: USTPathElements,
        })
        const results = await genProofAndPublicSignals(
            Circuit.proveUserSignUp,
            circuitInputs
        )

        return {
            proof: results['proof'],
            publicSignals: results['publicSignals'],
            epoch: results['publicSignals'][0],
            epochKey: results['publicSignals'][1],
            globalStateTreeRoot: results['publicSignals'][2],
            attesterId: results['publicSignals'][3],
            userHasSignedUp: results['publicSignals'][4],
        }
    }
}

export { Reputation, UserState }
