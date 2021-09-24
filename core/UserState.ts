import assert from 'assert'
import { IncrementalQuinTree, hash5, stringifyBigInts, hashOne, hashLeftRight, SparseMerkleTreeImpl } from '@unirep/crypto'
import { genProofAndPublicSignals } from '@unirep/circuits'
import { defaultUserStateLeaf, genEpochKey, genNewSMT, genEpochKeyNullifier, genReputationNullifier } from './utils'
import { IAttestation, UnirepState } from './UnirepState'
import { maxReputationBudget, numAttestationsPerProof, numEpochKeyNoncePerEpoch } from '../config/testLocal'

interface IUserStateLeaf {
    attesterId: BigInt;
    reputation: Reputation;
}

interface IReputation {
    posRep: BigInt;
    negRep: BigInt;
    graffiti: BigInt;
    signUp: BigInt;
}

class Reputation implements IReputation {
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public graffitiPreImage: BigInt = BigInt(0)
    public signUp: BigInt

    constructor(
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt,
    ) {
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.signUp = _signUp
    }

    public static default(): Reputation {
        return new Reputation(BigInt(0), BigInt(0), BigInt(0), BigInt(0))
    }

    public update = (
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt,
    ): Reputation => {
        this.posRep = BigInt(Number(this.posRep) + Number(_posRep))
        this.negRep = BigInt(Number(this.negRep) + Number(_negRep))
        if(_graffiti != BigInt(0)){
            this.graffiti = _graffiti
        }
        this.signUp = _signUp
        return this
    }

    public addGraffitiPreImage = (_graffitiPreImage: BigInt) => {
        assert(hashOne(_graffitiPreImage) === this.graffiti, 'Graffiti pre-image does not match')
        this.graffitiPreImage = _graffitiPreImage
    }

    public hash = (): BigInt => {
        return hash5([
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
            BigInt(0),
        ])
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                graffitiPreImage: this.graffitiPreImage.toString(),
                signUp: this.signUp.toString()
            },
            null,
            space
        )
    }
}

class UserState {
    public userStateTreeDepth: number
    public numEpochKeyNoncePerEpoch: number
    public numAttestationsPerProof: number

    private unirepState: UnirepState

    public id
    public commitment
    private hasSignedUp: boolean = false

    public latestTransitionedEpoch: number  // Latest epoch where the user has a record in the GST of that epoch
    public latestGSTLeafIndex: number  // Leaf index of the latest GST where the user has a record in
    private latestUserStateLeaves: IUserStateLeaf[]  // Latest non-default user state leaves

    constructor(
        _unirepState: UnirepState,
        _id,
        _commitment,
        _hasSignedUp: boolean,
        _transitionedPosRep?: number,
        _transitionedNegRep?: number,
        _currentEpochPosRep?: number,
        _currentEpochNegRep?: number,
        _latestTransitionedEpoch?: number,
        _latestGSTLeafIndex?: number,
        _latestUserStateLeaves?: IUserStateLeaf[],
    ) {
        assert(_unirepState !== undefined, "UnirepState is undefined")
        this.unirepState = _unirepState
        this.userStateTreeDepth = this.unirepState.userStateTreeDepth
        this.numEpochKeyNoncePerEpoch = this.unirepState.numEpochKeyNoncePerEpoch
        this.numAttestationsPerProof = numAttestationsPerProof

        this.id = _id
        this.commitment = _commitment
        if (_hasSignedUp) {
            assert(_latestTransitionedEpoch !== undefined, "User has signed up but missing latestTransitionedEpoch")
            assert(_latestGSTLeafIndex !== undefined, "User has signed up but missing latestTransitionedEpoch")
            assert(_transitionedPosRep !== undefined, "User has signed up but missing transitionedPosRep")
            assert(_transitionedNegRep !== undefined, "User has signed up but missing transitionedNegRep")
            assert(_currentEpochPosRep !== undefined, "User has signed up but missing currentEpochPosRep")
            assert(_currentEpochNegRep !== undefined, "User has signed up but missing currentEpochNegRep")

            this.latestTransitionedEpoch = _latestTransitionedEpoch
            this.latestGSTLeafIndex = _latestGSTLeafIndex
            if (_latestUserStateLeaves !== undefined) this.latestUserStateLeaves = _latestUserStateLeaves
            else this.latestUserStateLeaves = []
            this.hasSignedUp = _hasSignedUp
        } else {
            this.latestTransitionedEpoch = 0
            this.latestGSTLeafIndex = 0
            this.latestUserStateLeaves = []
        }
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                idNullifier: this.id.identityNullifier.toString(),
                idCommitment: this.commitment.toString(),
                hasSignedUp: this.hasSignedUp,
                latestTransitionedEpoch: this.latestTransitionedEpoch,
                latestGSTLeafIndex: this.latestGSTLeafIndex,
                latestUserStateLeaves: this.latestUserStateLeaves.map((l) => `${l.attesterId.toString()}: ${l.reputation.toJSON()}`),
                unirepState: JSON.parse(this.unirepState.toJSON())
            },
            null,
            space
        )
    }
    
    /*
     * Proxy methods to get underlying UnirepState data
     */
    public getUnirepStateCurrentEpoch = (): number => {
        return this.unirepState.currentEpoch
    }

    public getUnirepStateGSTree = (epoch: number): IncrementalQuinTree => {
        return this.unirepState.genGSTree(epoch)
    }

    public getUnirepStateEpochTree = async (epoch: number) => {
        return this.unirepState.genEpochTree(epoch)
    }

    /*
     * Get the attestations of given epoch key
     */
    public getAttestations = (epochKey: string): IAttestation[] => {
        return this.unirepState.getAttestations(epochKey)
    }

    /*
     * Get the epoch key nullifier of given epoch
     */
    public getEpochKeyNullifiers = (epoch: number): BigInt[] => {
        const nullifiers: BigInt[] = []
        for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
            const nullifier = genEpochKeyNullifier(this.id.identityNullifier, epoch, nonce)
            nullifiers.push(nullifier)
        }
        return nullifiers
    }

    public getRepByAttester = (attesterId: BigInt): Reputation => {
        const leaf = this.latestUserStateLeaves.find((leaf) => leaf.attesterId == attesterId)
        if (leaf !== undefined) return leaf.reputation
        else return Reputation.default()
    }

    /*
     * Check if given nullifier exists in nullifier tree
     */
    public nullifierExist = (nullifier: BigInt): boolean => {
        return this.unirepState.nullifierExist(nullifier)
    }

    /*
     * Add a new epoch key to the list of epoch key of current epoch.
     */
    public signUp = (_latestTransitionedEpoch: number, _latestGSTLeafIndex: number, _attesterId: number, _airdropAmount: number) => {
        assert(!this.hasSignedUp, "User has already signed up")
        this.latestTransitionedEpoch = _latestTransitionedEpoch
        this.latestGSTLeafIndex = _latestGSTLeafIndex
        this.hasSignedUp = true
        const signUpInLeaf = 1
        if(_attesterId && _airdropAmount) {
            const stateLeave: IUserStateLeaf = {
                attesterId: BigInt(_attesterId),
                reputation: Reputation.default().update(BigInt(_airdropAmount), BigInt(0), BigInt(0), BigInt(signUpInLeaf))
            }
            this.latestUserStateLeaves = [ stateLeave ]
        }
    }

    /*
     * Computes the user state tree with given state leaves
     */
    private _genUserStateTreeFromLeaves = async (leaves: IUserStateLeaf[]): Promise<SparseMerkleTreeImpl> => {
        const USTree = await genNewSMT(this.userStateTreeDepth, defaultUserStateLeaf)

        for (const leaf of leaves) {
            await USTree.update(leaf.attesterId, leaf.reputation.hash())
        }
        return USTree
    }

    /*
     * Computes the user state tree of given epoch
     */
    public genUserStateTree = async (): Promise<SparseMerkleTreeImpl> => {
        const leaves = this.latestUserStateLeaves
        return (await this._genUserStateTreeFromLeaves(leaves))
    }


    public genVerifyEpochKeyProof = async (
        epochKeyNonce: number,
    ) => {
        assert(this.hasSignedUp, "User has not signed up yet")
        assert(epochKeyNonce < this.numEpochKeyNoncePerEpoch, `epochKeyNonce(${epochKeyNonce}) must be less than max epoch nonce`)
        const epoch = this.latestTransitionedEpoch
        const epochKey = genEpochKey(this.id.identityNullifier, epoch, epochKeyNonce, this.unirepState.epochTreeDepth)
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.unirepState.genGSTree(epoch)
        const GSTProof = GSTree.genMerklePath(this.latestGSTLeafIndex)

        const circuitInputs = stringifyBigInts({
            GST_path_elements: GSTProof.pathElements,
            GST_path_index: GSTProof.indices,
            GST_root: GSTree.root,
            identity_pk: this.id.keypair.pubKey,
            identity_nullifier: this.id.identityNullifier, 
            identity_trapdoor: this.id.identityTrapdoor,
            user_tree_root: userStateTree.getRootHash(),
            nonce: epochKeyNonce,
            epoch: epoch,
            epoch_key: epochKey,
        })

        const results = await genProofAndPublicSignals('verifyEpochKey',circuitInputs)

        return { 
            proof: results['proof'],
            publicSignals: results['publicSignals'],
            globalStateTree: results['publicSignals'][0],
            epoch: results['publicSignals'][1],
            epochKey: results['publicSignals'][2],
        }
    }

    private _updateUserStateLeaf = (attestation: IAttestation, stateLeaves: IUserStateLeaf[]): IUserStateLeaf[] => {
        const attesterId = attestation.attesterId
        for (const leaf of stateLeaves) {
            if (leaf.attesterId === attesterId) {
                leaf.reputation = leaf.reputation.update(
                    attestation.posRep,
                    attestation.negRep,
                    attestation.graffiti,
                    attestation.signUp,
                )
                return stateLeaves
            }
        }
        // If no matching state leaf, insert new one
        const newLeaf: IUserStateLeaf = {
            attesterId: attesterId,
            reputation: Reputation.default().update(attestation.posRep, attestation.negRep, attestation.graffiti, attestation.signUp)
        }
        stateLeaves.push(newLeaf)
        return stateLeaves
    }

    public genNewUserStateAfterTransition = async () => {
        assert(this.hasSignedUp, "User has not signed up yet")
        const fromEpoch = this.latestTransitionedEpoch

        let stateLeaves: IUserStateLeaf[]
        stateLeaves = this.latestUserStateLeaves.slice()

        for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
            const epkNullifier = genEpochKeyNullifier(this.id.identityNullifier, fromEpoch, nonce)
            assert(! this.unirepState.nullifierExist(epkNullifier), `Epoch key with nonce ${nonce} is already processed, it's nullifier: ${epkNullifier}`)

            const epochKey = genEpochKey(this.id.identityNullifier, fromEpoch, nonce, this.unirepState.epochTreeDepth)
            const attestations = this.unirepState.getAttestations(epochKey.toString())
            for (let i = 0; i < attestations.length; i++) {
                const attestation = attestations[i]
                stateLeaves = this._updateUserStateLeaf(attestation, stateLeaves)
            }
        }

        // Gen new user state tree
        const newUserStateTree = await this._genUserStateTreeFromLeaves(stateLeaves)
    
        // Gen new GST leaf
        const newGSTLeaf = hashLeftRight(this.commitment, newUserStateTree.getRootHash())
        return {
            'newGSTLeaf': newGSTLeaf,
            'newUSTLeaves': stateLeaves
        }
    }

    private _genStartTransitionCircuitInputs = async (fromNonce: number, userStateTreeRoot: BigInt, GSTreeProof: any, GSTreeRoot: BigInt) => {
        // Circuit inputs
        const circuitInputs = stringifyBigInts({
            epoch: this.latestTransitionedEpoch,
            nonce: fromNonce,
            user_tree_root: userStateTreeRoot,
            identity_pk: this.id.keypair.pubKey,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.identityTrapdoor,
            GST_path_elements: GSTreeProof.pathElements,
            GST_path_index: GSTreeProof.indices,
            GST_root: GSTreeRoot,
        })

        // Circuit outputs
        // blinded user state and blinded hash chain are the inputs of processAttestationProofs
        const blindedUserState = hash5([
            this.id.identityNullifier,
            userStateTreeRoot,
            this.latestTransitionedEpoch,
            fromNonce,
            BigInt(0)
        ])
        const blindedHashChain = hash5([
            this.id.identityNullifier,
            BigInt(0), // hashchain starter
            this.latestTransitionedEpoch,
            fromNonce,
            BigInt(0)
        ])

        return {
            circuitInputs: circuitInputs,
            blindedUserState: blindedUserState,
            blindedHashChain: blindedHashChain,
        }
    }

    public genUserStateTransitionProofs = async () => {
        assert(this.hasSignedUp, "User has not signed up yet")
        const fromEpoch = this.latestTransitionedEpoch
        const fromNonce = 0

        // User state tree
        const fromEpochUserStateTree: SparseMerkleTreeImpl = await this.genUserStateTree()
        const intermediateUserStateTreeRoots: BigInt[] = [
            fromEpochUserStateTree.getRootHash()
        ]
        const userStateLeafPathElements: any[] = []
        // GSTree
        const fromEpochGSTree: IncrementalQuinTree = this.unirepState.genGSTree(fromEpoch)
        const GSTreeProof = fromEpochGSTree.genMerklePath(this.latestGSTLeafIndex)
        const GSTreeRoot = fromEpochGSTree.root
        // Epoch tree
        const fromEpochTree = await this.unirepState.genEpochTree(fromEpoch)
        const epochTreeRoot = fromEpochTree.getRootHash()
        const epochKeyPathElements: any[] = []

        // start transition proof
        const startTransitionCircuitInputs = await this._genStartTransitionCircuitInputs(fromNonce, intermediateUserStateTreeRoots[0], GSTreeProof, GSTreeRoot)
        
        // process attestation proof
        const processAttestationCircuitInputs: any[] = []
        const fromNonces: number[] = [ fromNonce ]
        const toNonces: number[] = []
        const hashChainStarter: BigInt[] = []
        const blindedUserState: BigInt[] = [ startTransitionCircuitInputs.blindedUserState ]
        const blindedHashChain: BigInt[] = []
        let reputationRecords = {}
        const selectors: number[] = []
        const attesterIds: BigInt[] = []
        const oldPosReps: BigInt[] = [], oldNegReps: BigInt[] = [], oldGraffities: BigInt[] = [], oldSignUps: BigInt[] = []
        const posReps: BigInt[] = [], negReps: BigInt[] = [], graffities: BigInt[] = [], overwriteGraffities: any[] = [], signUps: BigInt[] = []
        const finalBlindedUserState: BigInt[] = []
        const finalUserState: BigInt[] = [ intermediateUserStateTreeRoots[0] ]
        const finalHashChain: BigInt[] = []

        for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
            const epochKey = genEpochKey(this.id.identityNullifier, fromEpoch, nonce, this.unirepState.epochTreeDepth)
            let currentHashChain: BigInt = BigInt(0)

            // Blinded user state and hash chain of the epoch key
            toNonces.push(nonce)
            hashChainStarter.push(currentHashChain)

            // Attestations
            const attestations = this.unirepState.getAttestations(epochKey.toString())
            for (let i = 0; i < attestations.length; i++) {

                // Include a blinded user state and blinded hash chain per proof
                if(i && (i % this.numAttestationsPerProof == 0) && (i != this.numAttestationsPerProof - 1)){
                    toNonces.push(nonce)
                    fromNonces.push(nonce)
                    hashChainStarter.push(currentHashChain)
                    blindedUserState.push(hash5([this.id.identityNullifier, fromEpochUserStateTree.getRootHash(), fromEpoch, nonce]))
                }

                const attestation = attestations[i]
                const attesterId = attestation.attesterId
                const rep = this.getRepByAttester(attesterId)

                if (reputationRecords[attesterId.toString()] === undefined) {
                    reputationRecords[attesterId.toString()] = new Reputation(
                        rep.posRep,
                        rep.negRep,
                        rep.graffiti,
                        rep.signUp,
                    )
                }

                oldPosReps.push(reputationRecords[attesterId.toString()]['posRep'])
                oldNegReps.push(reputationRecords[attesterId.toString()]['negRep'])
                oldGraffities.push(reputationRecords[attesterId.toString()]['graffiti'])
                oldSignUps.push(reputationRecords[attesterId.toString()]['signUp'])

                // Add UST merkle proof to the list
                const USTLeafPathElements = await fromEpochUserStateTree.getMerkleProof(attesterId)
                userStateLeafPathElements.push(USTLeafPathElements)

                // Update attestation record
                reputationRecords[attesterId.toString()].update(
                    attestation['posRep'],
                    attestation['negRep'],
                    attestation['graffiti'],
                    attestation['signUp'],
                )

                // Update UST
                await fromEpochUserStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash())
                // Add new UST root to intermediate UST roots
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())
                
                selectors.push(1)
                attesterIds.push(attesterId)
                posReps.push(attestation['posRep'])
                negReps.push(attestation['negRep'])
                graffities.push(attestation['graffiti'])
                overwriteGraffities.push(attestation['graffiti'] != BigInt(0))
                signUps.push(attestation['signUp'])

                // Update current hashchain result
                const attestationHash = attestation.hash()
                currentHashChain = hashLeftRight(attestationHash, currentHashChain)
            }
            // Fill in blank data for non-exist attestation
            const filledAttestationNum = attestations.length ? Math.ceil(attestations.length / this.numAttestationsPerProof) * this.numAttestationsPerProof : this.numAttestationsPerProof
            for (let i = 0; i < (filledAttestationNum - attestations.length); i++) {
                oldPosReps.push(BigInt(0))
                oldNegReps.push(BigInt(0))
                oldGraffities.push(BigInt(0))
                oldSignUps.push(BigInt(0))
                
                const USTLeafZeroPathElements = await fromEpochUserStateTree.getMerkleProof(BigInt(0))
                userStateLeafPathElements.push(USTLeafZeroPathElements)
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())

                selectors.push(0)
                attesterIds.push(BigInt(0))
                posReps.push(BigInt(0))
                negReps.push(BigInt(0))
                graffities.push(BigInt(0))
                overwriteGraffities.push(BigInt(0))
                signUps.push(BigInt(0))
            }
            epochKeyPathElements.push(await fromEpochTree.getMerkleProof(epochKey))
            finalUserState.push(fromEpochUserStateTree.getRootHash())
            finalHashChain.push(currentHashChain)
            blindedUserState.push(hash5([this.id.identityNullifier, fromEpochUserStateTree.getRootHash(), fromEpoch, nonce]))
            finalBlindedUserState.push(hash5([this.id.identityNullifier, fromEpochUserStateTree.getRootHash(), fromEpoch, nonce]))
            blindedHashChain.push(hash5([this.id.identityNullifier, currentHashChain, fromEpoch, nonce]))
            if(nonce != this.numEpochKeyNoncePerEpoch - 1) fromNonces.push(nonce)
        }

        for (let i = 0; i < fromNonces.length; i++) {
            const startIdx = this.numAttestationsPerProof * i
            const endIdx = this.numAttestationsPerProof * (i+1)
            if(fromNonces[i] == toNonces[i] && intermediateUserStateTreeRoots[startIdx] == intermediateUserStateTreeRoots[endIdx]) continue
            processAttestationCircuitInputs.push(stringifyBigInts({
                epoch: fromEpoch,
                from_nonce: fromNonces[i],
                to_nonce: toNonces[i],
                identity_nullifier: this.id.identityNullifier,
                intermediate_user_state_tree_roots: intermediateUserStateTreeRoots.slice(startIdx, endIdx + 1),
                old_pos_reps: oldPosReps.slice(startIdx, endIdx),
                old_neg_reps: oldNegReps.slice(startIdx, endIdx),
                old_graffities: oldGraffities.slice(startIdx, endIdx),
                old_sign_ups: oldSignUps.slice(startIdx, endIdx),
                path_elements: userStateLeafPathElements.slice(startIdx, endIdx),
                attester_ids: attesterIds.slice(startIdx, endIdx),
                pos_reps: posReps.slice(startIdx, endIdx),
                neg_reps: negReps.slice(startIdx, endIdx),
                graffities: graffities.slice(startIdx, endIdx),
                overwrite_graffities: overwriteGraffities.slice(startIdx, endIdx),
                sign_ups: signUps.slice(startIdx, endIdx),
                selectors: selectors.slice(startIdx, endIdx),
                hash_chain_starter: hashChainStarter[i],
                input_blinded_user_state: blindedUserState[i],
            }))
        }

        // final user state transition proof
        const finalTransitionCircuitInputs = stringifyBigInts({
            epoch: fromEpoch,
            blinded_user_state: finalBlindedUserState,
            intermediate_user_state_tree_roots: finalUserState,
            identity_pk: this.id.keypair.pubKey,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.identityTrapdoor,
            GST_path_elements: GSTreeProof.pathElements,
            GST_path_index: GSTreeProof.indices,
            GST_root: GSTreeRoot,
            epk_path_elements: epochKeyPathElements,
            hash_chain_results: finalHashChain,
            blinded_hash_chain_results: blindedHashChain,
            epoch_tree_root: epochTreeRoot
        })

        // Generate proofs
        const startTransitionresults = await genProofAndPublicSignals('startTransition', startTransitionCircuitInputs.circuitInputs)

        const processAttestationProofs: any[] = []
        for (let i = 0; i < processAttestationCircuitInputs.length; i++) {
            const results = await genProofAndPublicSignals('processAttestations', processAttestationCircuitInputs[i])
            processAttestationProofs.push({
                proof: results['proof'],
                publicSignals: results['publicSignals'],
                outputBlindedUserState: results['publicSignals'][0],
                outputBlindedHashChain: results['publicSignals'][1],
                inputBlindedUserState: results['publicSignals'][2],
            })
        }

        const finalProofResults = await genProofAndPublicSignals('userStateTransition', finalTransitionCircuitInputs)

        return {
            startTransitionProof: {
                proof: startTransitionresults['proof'],
                publicSignals: startTransitionresults['publicSignals'],
                blindedUserState: startTransitionresults['publicSignals'][0],
                blindedHashChain: startTransitionresults['publicSignals'][1],
                globalStateTreeRoot: startTransitionresults['publicSignals'][2],
            },
            processAttestationProofs: processAttestationProofs,
            finalTransitionProof: {
                proof: finalProofResults['proof'],
                publicSignals: finalProofResults['publicSignals'],
                newGlobalStateTreeLeaf: finalProofResults['publicSignals'][0],
                epochKeyNullifiers: finalProofResults['publicSignals'].slice(1, 1+numEpochKeyNoncePerEpoch),
                transitionedFromEpoch: finalProofResults['publicSignals'][1+numEpochKeyNoncePerEpoch],
                blindedUserStates: finalProofResults['publicSignals'].slice(2 + numEpochKeyNoncePerEpoch, 2 + 2* numEpochKeyNoncePerEpoch),
                fromGSTRoot: finalProofResults['publicSignals'][2 + numEpochKeyNoncePerEpoch * 2],
                blindedHashChains: finalProofResults['publicSignals'].slice(3+ 2* numEpochKeyNoncePerEpoch, 3+3* numEpochKeyNoncePerEpoch),
                fromEpochTree: finalProofResults['publicSignals'][3+3*numEpochKeyNoncePerEpoch],
            }
        }
    }

    /*
     * Update transition data including latest transition epoch, GST leaf index and user state tree leaves.
     */
    public transition = (
        latestStateLeaves: IUserStateLeaf[],
    ) => {
        assert(this.hasSignedUp, "User has not signed up yet")

        const fromEpoch = this.latestTransitionedEpoch
        const transitionToEpoch = this.unirepState.currentEpoch
        const transitionToGSTIndex = this.unirepState.getNumGSTLeaves(transitionToEpoch)
        assert(fromEpoch < transitionToEpoch, "Can not transition to same epoch")

        this.latestTransitionedEpoch = transitionToEpoch
        this.latestGSTLeafIndex = transitionToGSTIndex

        // Update user state leaves
        this.latestUserStateLeaves = latestStateLeaves.slice()
    }

    public genProveReputationProof = async (
        attesterId: BigInt,
        repNullifiersAmount: number,
        epkNonce: number,
        minRep: BigInt,
        proveGraffiti: BigInt,
        graffitiPreImage: BigInt,
    ) => {
        assert(this.hasSignedUp, "User has not signed up yet")
        assert(attesterId > BigInt(0), `attesterId must be greater than zero`)
        assert(attesterId < BigInt(2 ** this.userStateTreeDepth), `attesterId exceeds total number of attesters`)
        const epoch = this.latestTransitionedEpoch
        const epochKey = genEpochKey(this.id.identityNullifier, epoch, epkNonce)
        const rep = this.getRepByAttester(attesterId)
        const posRep = rep.posRep
        const negRep = rep.negRep
        const graffiti = rep.graffiti
        const signUp = rep.signUp
        const userStateTree = await this.genUserStateTree()
        const GSTree = this.unirepState.genGSTree(epoch)
        const GSTreeProof = GSTree.genMerklePath(this.latestGSTLeafIndex)
        const GSTreeRoot = GSTree.root
        const USTPathElements = await userStateTree.getMerkleProof(attesterId)
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        let nonceStarter = -1
        if(repNullifiersAmount > 0) {
            // find valid nonce starter
            for (let n = 0; n < Number(posRep) - Number(negRep); n++) {
                const reputationNullifier = genReputationNullifier(this.id.identityNullifier, epoch, n)
                if(!this.unirepState.nullifierExist(reputationNullifier)) {
                    nonceStarter = n
                    break
                }
            }
            assert(nonceStarter != -1, "Cannot find valid nonce")
            assert((nonceStarter + repNullifiersAmount) <= Number(posRep) - Number(negRep), "Not enough reputation to spend")
            for (let i = 0; i < repNullifiersAmount; i++) {
                nonceList.push( BigInt(nonceStarter + i) )
                selectors.push(BigInt(1));
            }
        }
        
        for (let i = repNullifiersAmount ; i < maxReputationBudget ; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        const circuitInputs = stringifyBigInts({
            epoch: epoch,
            epoch_key_nonce: epkNonce,
            epoch_key: epochKey,
            identity_pk: this.id.keypair.pubKey,
            identity_nullifier: this.id.identityNullifier, 
            identity_trapdoor: this.id.identityTrapdoor,
            user_tree_root: userStateTree.getRootHash(),
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
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
            min_rep: minRep,
            prove_graffiti: proveGraffiti,
            graffiti_pre_image: graffitiPreImage
        })

        const results = await genProofAndPublicSignals('proveReputation',circuitInputs)

        return {
            proof: results['proof'],
            publicSignals: results['publicSignals'],
            reputationNullifiers: results['publicSignals'].slice(0, maxReputationBudget),
            epoch: results['publicSignals'][maxReputationBudget],
            epochKey: results['publicSignals'][maxReputationBudget+1],
            globalStatetreeRoot: results['publicSignals'][maxReputationBudget+2],
            attesterId: results['publicSignals'][maxReputationBudget+3],
            proveReputationAmount: results['publicSignals'][maxReputationBudget+4],
            minRep: results['publicSignals'][maxReputationBudget+5],
            proveGraffiti: results['publicSignals'][maxReputationBudget+6],
            graffitiPreImage: results['publicSignals'][maxReputationBudget+7],
        }
    }

    public genUserSignUpProof = async (
        attesterId: BigInt,
    ) => {
        assert(this.hasSignedUp, "User has not signed up yet")
        assert(attesterId > BigInt(0), `attesterId must be greater than zero`)
        assert(attesterId < BigInt(2 ** this.userStateTreeDepth), `attesterId exceeds total number of attesters`)
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
        const GSTreeProof = GSTree.genMerklePath(this.latestGSTLeafIndex)
        const GSTreeRoot = GSTree.root
        const USTPathElements = await userStateTree.getMerkleProof(attesterId)

        const circuitInputs = stringifyBigInts({
            epoch: epoch,
            epoch_key: epochKey,
            identity_pk: this.id.keypair.pubKey,
            identity_nullifier: this.id.identityNullifier, 
            identity_trapdoor: this.id.identityTrapdoor,
            user_tree_root: userStateTree.getRootHash(),
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti: graffiti,
            sign_up: signUp,
            UST_path_elements: USTPathElements,
        })

        const results = await genProofAndPublicSignals('proveUserSignUp',circuitInputs)

        return {
            proof: results['proof'],
            publicSignals: results['publicSignals'],
            epoch: results['publicSignals'][0],
            epochKey: results['publicSignals'][1],
            globalStateTreeRoot: results['publicSignals'][2],
            attesterId: results['publicSignals'][3],
        }
    }
}

export {
    IReputation,
    IUserStateLeaf,
    Reputation,
    UserState,
}