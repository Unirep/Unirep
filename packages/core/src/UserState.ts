import { BigNumber } from 'ethers'
import assert from 'assert'
import {
    IncrementalMerkleTree,
    hash5,
    stringifyBigInts,
    hashLeftRight,
    SparseMerkleTree,
    ZkIdentity,
    unstringifyBigInts,
} from '@unirep/crypto'
import { Attestation } from '@unirep/contracts'
import { CircuitName } from '@unirep/circuits'

import {
    IEpochTreeLeaf,
    IReputation,
    IUserState,
    IUserStateLeaf,
} from './interfaces'
import Reputation from './Reputation'
import UnirepState from './UnirepState'
import { UnirepProtocol } from './UnirepProtocol'

export default class UserState extends UnirepState {
    public id: ZkIdentity
    public commitment: bigint
    private hasSignedUp: boolean = false

    public latestTransitionedEpoch: number // Latest epoch where the user has a record in the GST of that epoch
    public latestGSTLeafIndex: number // Leaf index of the latest GST where the user has a record in
    private latestUserStateLeaves: IUserStateLeaf[] // Latest non-default user state leaves
    private transitionedFromAttestations: { [key: string]: Attestation[] } = {} // attestations in the latestTransitionedEpoch

    constructor(
        _zkFilesPath: string,
        _id: ZkIdentity,
        // unirep config
        _currentEpoch?: number,
        _latestBlock?: number,
        _GSTLeaves?: { [key: number]: BigInt[] },
        _epochTreeLeaves?: { [key: number]: IEpochTreeLeaf[] },
        _epochKeyToAttestationsMap?: { [key: string]: Attestation[] },
        _nullifiers?: { [key: string]: boolean },
        // user config
        _hasSignedUp?: boolean,
        _latestTransitionedEpoch?: number,
        _latestGSTLeafIndex?: number,
        _latestUserStateLeaves?: IUserStateLeaf[],
        _transitionedFromAttestations?: { [key: string]: Attestation[] }
    ) {
        super(
            _zkFilesPath,
            _currentEpoch,
            _latestBlock,
            _GSTLeaves,
            _epochTreeLeaves,
            _epochKeyToAttestationsMap,
            _nullifiers
        )

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

    public toJSON(): IUserState {
        const {
            currentEpoch,
            latestProcessedBlock,
            GSTLeaves,
            epochTreeLeaves,
            latestEpochKeyToAttestationsMap,
            nullifiers,
        } = super.toJSON()
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
            nonce < this.config.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epk = this.genEpochKey(
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
            config: JSON.parse(JSON.stringify(this.config)),
            idNullifier: this.id.identityNullifier,
            idCommitment: this.commitment,
            hasSignedUp: this.hasSignedUp,
            latestTransitionedEpoch: this.latestTransitionedEpoch,
            latestGSTLeafIndex: this.latestGSTLeafIndex,
            latestUserStateLeaves: userStateLeavesMapToString,
            transitionedFromAttestations: transitionedFromAttestationsToString,
            currentEpoch,
            latestProcessedBlock,
            GSTLeaves,
            epochTreeLeaves,
            latestEpochKeyToAttestationsMap,
            nullifiers,
        }
    }

    // cannot override UnirepState.fromJSON
    public static fromJSONAndID(
        identity: ZkIdentity,
        data: IUserState
    ): UserState {
        const _userState = typeof data === 'string' ? JSON.parse(data) : data
        const parsedGSTLeaves = {}
        const parsedEpochTreeLeaves = {}
        const parsedNullifiers = {}
        const parsedAttestationsMap = {}

        for (let key in _userState.GSTLeaves) {
            parsedGSTLeaves[key] = unstringifyBigInts(_userState.GSTLeaves[key])
        }

        for (let key in _userState.epochTreeLeaves) {
            const leaves: IEpochTreeLeaf[] = []
            _userState.epochTreeLeaves[key].map((n: any) => {
                const splitStr = n.split(': ')
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(splitStr[0]),
                    hashchainResult: BigInt(splitStr[1]),
                }
                leaves.push(epochTreeLeaf)
            })
            parsedEpochTreeLeaves[key] = leaves
        }

        for (let n of _userState.nullifiers) {
            parsedNullifiers[n] = true
        }
        for (let key in _userState.latestEpochKeyToAttestationsMap) {
            const parsedAttestations: Attestation[] = []
            for (const attestation of _userState
                .latestEpochKeyToAttestationsMap[key]) {
                const jsonAttestation = JSON.parse(attestation)
                const attestClass = new Attestation(
                    jsonAttestation.attesterId,
                    jsonAttestation.posRep,
                    jsonAttestation.negRep,
                    jsonAttestation.graffiti,
                    jsonAttestation.signUp
                )
                parsedAttestations.push(attestClass)
            }
            parsedAttestationsMap[key] = parsedAttestations
        }
        const userStateLeaves: IUserStateLeaf[] = []
        const transitionedFromAttestations: { [key: string]: Attestation[] } =
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
                const attestation: Attestation = new Attestation(
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
            _userState.config.exportBuildPath,
            identity,
            _userState.currentEpoch,
            _userState.latestProcessedBlock,
            parsedGSTLeaves,
            parsedEpochTreeLeaves,
            parsedAttestationsMap,
            parsedNullifiers,
            _userState.hasSignedUp,
            _userState.latestTransitionedEpoch,
            _userState.latestGSTLeafIndex,
            userStateLeaves,
            transitionedFromAttestations
        )
        return userState
    }

    /**
     * Get the epoch key nullifier of given epoch
     */
    public getEpochKeyNullifiers(epoch: number): BigInt[] {
        const nullifiers: BigInt[] = []
        for (
            let nonce = 0;
            nonce < this.config.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const nullifier = UserState.genEpochKeyNullifier(
                this.id.identityNullifier,
                epoch,
                nonce
            )
            nullifiers.push(nullifier)
        }
        return nullifiers
    }

    public getRepByAttester(attesterId: BigInt): IReputation {
        const leaf = this.latestUserStateLeaves.find(
            (leaf) => leaf.attesterId == attesterId
        )
        if (leaf !== undefined) return leaf.reputation
        else return Reputation.default()
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
    private _checkUserNotSignUp() {
        assert(!this.hasSignedUp, 'UserState: User has already signed up')
    }

    /**
     * Check if epoch key nonce is valid
     */
    private _checkEpkNonce(epochKeyNonce: number) {
        assert(
            epochKeyNonce < this.config.numEpochKeyNoncePerEpoch,
            `epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
        )
    }

    /**
     * Check if attester ID is valid
     */
    private _checkAttesterId(attesterId: BigInt) {
        assert(
            attesterId > BigInt(0),
            `UserState: attesterId must be greater than zero`
        )
        assert(
            attesterId < BigInt(2 ** this.config.userStateTreeDepth),
            `UserState: attesterId exceeds total number of attesters`
        )
    }

    /**
     * Add a new epoch key to the list of epoch key of current epoch.
     */
    public async signUp(
        epoch: number,
        identityCommitment: BigInt,
        attesterId?: number,
        airdropAmount?: number,
        blockNumber?: number
    ) {
        // update unirep state
        await super.signUp(
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
            this.latestGSTLeafIndex = this.getNumGSTLeaves(epoch) - 1
            this.hasSignedUp = true
        }
    }

    /**
     * Computes the user state tree with given state leaves
     */
    private async _genUserStateTreeFromLeaves(
        leaves: IUserStateLeaf[]
    ): Promise<SparseMerkleTree> {
        const USTree = await this.genNewUST()
        for (const leaf of leaves) {
            await USTree.update(leaf.attesterId, leaf.reputation.hash())
        }
        return USTree
    }

    /**
     * Computes the user state tree of given epoch
     */
    public async genUserStateTree(): Promise<SparseMerkleTree> {
        const leaves = this.latestUserStateLeaves
        return await this._genUserStateTreeFromLeaves(leaves)
    }

    /**
     * Update user state and unirep state according to user state transition event
     */
    public async userStateTransition(
        fromEpoch: number,
        GSTLeaf: BigInt,
        nullifiers: BigInt[],
        blockNumber?: number
    ) {
        if (this.hasSignedUp && this.latestTransitionedEpoch === fromEpoch) {
            // Latest epoch user transitioned to ends. Generate nullifiers of all epoch key
            const userEpkNullifiers = this.getEpochKeyNullifiers(fromEpoch)
            let epkNullifiersMatched = 0
            for (const nullifier of userEpkNullifiers) {
                if (nullifiers.indexOf(nullifier) !== -1) epkNullifiersMatched++
            }

            // Here we assume all epoch keys are processed in the same epoch. If this assumption does not
            // stand anymore, below `epkNullifiersMatched` check should be changed.
            if (epkNullifiersMatched == this.config.numEpochKeyNoncePerEpoch) {
                await this._transition(GSTLeaf)
            } else if (epkNullifiersMatched > 0) {
                console.error(
                    `Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${this.config.numEpochKeyNoncePerEpoch}`
                )
                return
            }
        }

        super.userStateTransition(fromEpoch, GSTLeaf, nullifiers, blockNumber)
    }

    public async genVerifyEpochKeyProof(epochKeyNonce: number) {
        this._checkUserSignUp()
        this._checkEpkNonce(epochKeyNonce)
        const epoch = this.latestTransitionedEpoch
        const epochKey = this.genEpochKey(
            this.id.identityNullifier,
            epoch,
            epochKeyNonce
        )
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.genGSTree(epoch)
        const GSTProof = GSTree.createProof(this.latestGSTLeafIndex)

        const circuitInputs = stringifyBigInts({
            GST_path_elements: GSTProof.siblings,
            GST_path_index: GSTProof.pathIndices,
            GST_root: GSTree.root,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.getRootHash(),
            nonce: epochKeyNonce,
            epoch: epoch,
            epoch_key: epochKey,
        })

        const results = await super.genProof(
            CircuitName.verifyEpochKey,
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

    private _updateUserStateLeaf(
        attestation: Attestation,
        stateLeaves: IUserStateLeaf[]
    ): IUserStateLeaf[] {
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

    private _saveAttestations() {
        this._checkUserSignUp()
        const fromEpoch = this.latestTransitionedEpoch

        for (
            let nonce = 0;
            nonce < this.config.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epochKey = this.genEpochKey(
                this.id.identityNullifier,
                fromEpoch,
                nonce
            ).toString()
            const attestations = this.getAttestations(epochKey)
            this.transitionedFromAttestations[epochKey] = attestations
        }
    }

    public async epochTransition(epoch: number, blockNumber?: number) {
        await super.epochTransition(epoch, blockNumber)
        if (epoch === this.latestTransitionedEpoch) {
            // save latest attestations in user state
            this._saveAttestations()
        }
    }

    private async _genNewUserStateAfterTransition() {
        this._checkUserSignUp()
        const fromEpoch = this.latestTransitionedEpoch

        let stateLeaves: IUserStateLeaf[]
        stateLeaves = this.latestUserStateLeaves.slice()

        for (
            let nonce = 0;
            nonce < this.config.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epkNullifier = UnirepProtocol.genEpochKeyNullifier(
                this.id.identityNullifier,
                fromEpoch,
                nonce
            )
            assert(
                !this.nullifierExist(epkNullifier),
                `Epoch key with nonce ${nonce} is already processed, it's nullifier: ${epkNullifier}`
            )

            const epochKey = this.genEpochKey(
                this.id.identityNullifier,
                fromEpoch,
                nonce
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
        const newGSTLeaf = hashLeftRight(
            this.commitment,
            newUserStateTree.getRootHash()
        )
        return {
            newGSTLeaf: newGSTLeaf,
            newUSTLeaves: stateLeaves,
        }
    }

    private async _genStartTransitionCircuitInputs(
        fromNonce: number,
        userStateTreeRoot: BigInt,
        GSTreeProof: any,
        GSTreeRoot: BigInt
    ) {
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
        const intermediateUserStateTreeRoots: BigInt[] = [
            fromEpochUserStateTree.getRootHash(),
        ]
        const userStateLeafPathElements: any[] = []
        // GSTree
        const fromEpochGSTree: IncrementalMerkleTree = this.genGSTree(fromEpoch)
        const GSTreeProof = fromEpochGSTree.createProof(this.latestGSTLeafIndex)
        const GSTreeRoot = fromEpochGSTree.root
        // Epoch tree
        const fromEpochTree = await this.genEpochTree(fromEpoch)
        const epochTreeRoot = fromEpochTree.getRootHash()
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
        const attesterIds: BigInt[] = []
        const oldPosReps: BigInt[] = [],
            oldNegReps: BigInt[] = [],
            oldGraffities: BigInt[] = [],
            oldSignUps: BigInt[] = []
        const posReps: BigInt[] = [],
            negReps: BigInt[] = [],
            graffities: BigInt[] = [],
            overwriteGraffities: any[] = [],
            signUps: BigInt[] = []
        const finalBlindedUserState: BigInt[] = []
        const finalUserState: BigInt[] = [intermediateUserStateTreeRoots[0]]
        const finalHashChain: BigInt[] = []

        for (
            let nonce = 0;
            nonce < this.config.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epochKey = this.genEpochKey(
                this.id.identityNullifier,
                fromEpoch,
                nonce
            )
            let currentHashChain: BigInt = BigInt(0)

            // Blinded user state and hash chain of the epoch key
            toNonces.push(nonce)
            hashChainStarter.push(currentHashChain)

            // Attestations
            const attestations = this.getAttestations(epochKey.toString())
            for (let i = 0; i < attestations.length; i++) {
                // Include a blinded user state and blinded hash chain per proof
                if (
                    i &&
                    i % this.config.numAttestationsPerProof == 0 &&
                    i != this.config.numAttestationsPerProof - 1
                ) {
                    toNonces.push(nonce)
                    fromNonces.push(nonce)
                    hashChainStarter.push(currentHashChain)
                    blindedUserState.push(
                        hash5([
                            this.id.identityNullifier,
                            fromEpochUserStateTree.getRootHash(),
                            BigInt(fromEpoch),
                            BigInt(nonce),
                        ])
                    )
                }

                const attestation = attestations[i]
                const attesterId: BigInt = attestation.attesterId.toBigInt()
                const rep = this.getRepByAttester(attesterId as BigInt)

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
                    await fromEpochUserStateTree.getMerkleProof(attesterId)
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
                intermediateUserStateTreeRoots.push(
                    fromEpochUserStateTree.getRootHash()
                )

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
                      attestations.length / this.config.numAttestationsPerProof
                  ) * this.config.numAttestationsPerProof
                : this.config.numAttestationsPerProof
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
                    await fromEpochUserStateTree.getMerkleProof(BigInt(0))
                userStateLeafPathElements.push(USTLeafZeroPathElements)
                intermediateUserStateTreeRoots.push(
                    fromEpochUserStateTree.getRootHash()
                )

                selectors.push(0)
                attesterIds.push(BigInt(0))
                posReps.push(BigInt(0))
                negReps.push(BigInt(0))
                graffities.push(BigInt(0))
                overwriteGraffities.push(BigInt(0))
                signUps.push(BigInt(0))
            }
            epochKeyPathElements.push(
                await fromEpochTree.getMerkleProof(epochKey)
            )
            // finalUserState.push(fromEpochUserStateTree.getRootHash())
            finalHashChain.push(currentHashChain)
            blindedUserState.push(
                hash5([
                    this.id.identityNullifier,
                    fromEpochUserStateTree.getRootHash(),
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
            if (nonce != this.config.numEpochKeyNoncePerEpoch - 1)
                fromNonces.push(nonce)
        }

        for (let i = 0; i < fromNonces.length; i++) {
            const startIdx = this.config.numAttestationsPerProof * i
            const endIdx = this.config.numAttestationsPerProof * (i + 1)
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
        const endEpochKeyNonce = this.config.numEpochKeyNoncePerEpoch - 1
        finalUserState.push(fromEpochUserStateTree.getRootHash())
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
        const startTransitionresults = await super.genProof(
            CircuitName.startTransition,
            startTransitionCircuitInputs.circuitInputs
        )

        const processAttestationProofs: any[] = []
        for (let i = 0; i < processAttestationCircuitInputs.length; i++) {
            const results = await super.genProof(
                CircuitName.processAttestations,
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

        const finalProofResults = await super.genProof(
            CircuitName.userStateTransition,
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
                    1 + this.config.numEpochKeyNoncePerEpoch
                ),
                transitionedFromEpoch:
                    finalProofResults.publicSignals[
                        1 + this.config.numEpochKeyNoncePerEpoch
                    ],
                blindedUserStates: finalProofResults.publicSignals.slice(
                    2 + this.config.numEpochKeyNoncePerEpoch,
                    4 + this.config.numEpochKeyNoncePerEpoch
                ),
                fromGSTRoot:
                    finalProofResults.publicSignals[
                        4 + this.config.numEpochKeyNoncePerEpoch
                    ],
                blindedHashChains: finalProofResults.publicSignals.slice(
                    5 + this.config.numEpochKeyNoncePerEpoch,
                    5 + 2 * this.config.numEpochKeyNoncePerEpoch
                ),
                fromEpochTree:
                    finalProofResults.publicSignals[
                        5 + 2 * this.config.numEpochKeyNoncePerEpoch
                    ],
            },
        }
    }

    /**
     * Update transition data including latest transition epoch, GST leaf index and user state tree leaves.
     */
    private async _transition(newLeaf: BigInt) {
        this._checkUserSignUp()

        const fromEpoch = this.latestTransitionedEpoch
        const transitionToEpoch = this.currentEpoch
        const transitionToGSTIndex = this.getNumGSTLeaves(transitionToEpoch)
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

    public async genProveReputationProof(
        attesterId: BigInt,
        epkNonce: number,
        minRep?: number,
        proveGraffiti?: BigInt,
        graffitiPreImage?: BigInt,
        nonceList?: BigInt[]
    ) {
        this._checkUserSignUp()
        this._checkEpkNonce(epkNonce)

        if (nonceList == undefined)
            nonceList = new Array(this.config.maxReputationBudget).fill(
                BigInt(-1)
            )
        assert(
            nonceList.length == this.config.maxReputationBudget,
            `Length of nonce list should be ${this.config.maxReputationBudget}`
        )
        const epoch = this.latestTransitionedEpoch
        const epochKey = this.genEpochKey(
            this.id.identityNullifier,
            epoch,
            epkNonce
        )
        const rep = this.getRepByAttester(attesterId)
        const posRep = rep.posRep
        const negRep = rep.negRep
        const graffiti = rep.graffiti
        const signUp = rep.signUp
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(this.latestGSTLeafIndex)
        const GSTreeRoot = GSTree.root
        const USTPathElements = await userStateTree.getMerkleProof(attesterId)
        const selectors: BigInt[] = []
        const nonceExist = {}
        let repNullifiersAmount = 0
        for (let i = 0; i < this.config.maxReputationBudget; i++) {
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
                const reputationNullifier =
                    UnirepProtocol.genReputationNullifier(
                        this.id.identityNullifier,
                        epoch,
                        n,
                        attesterId
                    )
                if (!this.nullifierExist(reputationNullifier)) {
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
            user_tree_root: userStateTree.getRootHash(),
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

        const results = await super.genProof(
            CircuitName.proveReputation,
            circuitInputs
        )

        return {
            proof: results['proof'],
            publicSignals: results['publicSignals'],
            reputationNullifiers: results['publicSignals'].slice(
                0,
                this.config.maxReputationBudget
            ),
            epoch: results['publicSignals'][this.config.maxReputationBudget],
            epochKey:
                results['publicSignals'][this.config.maxReputationBudget + 1],
            globalStatetreeRoot:
                results['publicSignals'][this.config.maxReputationBudget + 2],
            attesterId:
                results['publicSignals'][this.config.maxReputationBudget + 3],
            proveReputationAmount:
                results['publicSignals'][this.config.maxReputationBudget + 4],
            minRep: results['publicSignals'][
                this.config.maxReputationBudget + 5
            ],
            proveGraffiti:
                results['publicSignals'][this.config.maxReputationBudget + 6],
            graffitiPreImage:
                results['publicSignals'][this.config.maxReputationBudget + 7],
        }
    }

    public async genUserSignUpProof(attesterId: BigInt) {
        this._checkUserSignUp()
        this._checkAttesterId(attesterId)
        const epoch = this.latestTransitionedEpoch
        const nonce = 0 // fixed epk nonce
        const epochKey = this.genEpochKey(
            this.id.identityNullifier,
            epoch,
            nonce
        )
        const rep = this.getRepByAttester(attesterId)
        const posRep = rep.posRep
        const negRep = rep.negRep
        const graffiti = rep.graffiti
        const signUp = rep.signUp
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(this.latestGSTLeafIndex)
        const GSTreeRoot = GSTree.root
        const USTPathElements = await userStateTree.getMerkleProof(attesterId)

        const circuitInputs = stringifyBigInts({
            epoch: epoch,
            epoch_key: epochKey,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.getRootHash(),
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
        const results = await super.genProof(
            CircuitName.proveUserSignUp,
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
