import { ethers } from "@nomiclabs/buidler"
import { BigNumber, Contract, Signer, Wallet } from "ethers"
import chai, { use } from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, maxEpochKeyNonce, numAttestationsPerBatch} from '../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, SnarkBigInt, genRandomSalt, stringifyBigInts, hashLeftRight, hashOne } from 'maci-crypto'
import { deployUnirep, genNoAttestationNullifierKey, genEpochKey, toCompleteHexString, computeNullifier, genNewEpochTree, genNewNullifierTree, genNewUserStateTree, SMT_ONE_LEAF, computeReputationHash, defaultUserStateLeaf, computeEmptyUserStateRoot } from './utils'

chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"
import { Attestation, IAttestation, IEpochTreeLeaf, UnirepState } from "../core/UnirepState"
import { SparseMerkleTreeImpl } from "../crypto/SMT"
import { compileAndLoadCircuit, formatProofForVerifierContract, genVerifyEpochKeyProofAndPublicSignals, genVerifyReputationProofAndPublicSignals, genVerifyUserStateTransitionProofAndPublicSignals, verifyEPKProof, verifyProveReputationProof, verifyUserStateTransitionProof } from "./circuits/utils"
import { IReputation, IUserStateLeaf, Reputation, UserState } from "../core/UserState"

describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    let userStateLeaves: { [key: string]: IReputation }[] = new Array(2)

    let attesters = new Array(2)
    let unirepContractCalledByFisrtAttester, unirepContractCalledBySecondAttester

    let unirepContract: Contract
    let prevEpoch: BigNumber
    let currentEpoch: BigNumber
    let emptyUserStateRoot
    let blankGSLeaf
    let nullifierTree : SparseMerkleTreeImpl

    let accounts: Signer[]

    let usersLocalStateTransitionData = {}

    let verifyEpochKeyCircuit, verifyUserStateTransitionCircuit, verifyReputationCircuit
    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        verifyEpochKeyCircuit = await compileAndLoadCircuit('test/verifyEpochKey_test.circom')
        verifyUserStateTransitionCircuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
        verifyReputationCircuit = await compileAndLoadCircuit('test/proveReputation_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Total compile time for three circuits: ${endCompileTime - startCompileTime} seconds`)

        accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(<Wallet>accounts[0], "circuit")
        currentEpoch = await unirepContract.currentEpoch()

        emptyUserStateRoot = computeEmptyUserStateRoot(circuitUserStateTreeDepth)

        blankGSLeaf = await unirepContract.hashedBlankStateLeaf()

        nullifierTree = await genNewNullifierTree("circuit")

        unirepState = new UnirepState(
            circuitGlobalStateTreeDepth,
            circuitUserStateTreeDepth,
            circuitEpochTreeDepth,
            circuitNullifierTreeDepth,
            attestingFee,
            epochLength,
            maxEpochKeyNonce,
            numAttestationsPerBatch,
        )
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
            const GSTreeLeafIndex = 0
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            users[0] = new UserState(
                circuitUserStateTreeDepth,
                maxEpochKeyNonce,
                numAttestationsPerBatch,
                unirepState,
                id,
                commitment,
                latestTransitionedToEpoch,
                GSTreeLeafIndex,
            )
            userStateLeaves[0] = {}
        })

        it('First attester signs up', async () => {
            attesters[0] = new Object()
            attesters[0]['acct'] = accounts[1]
            attesters[0]['addr'] = await attesters[0]['acct'].getAddress()
            unirepContractCalledByFisrtAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[0]['acct'])

            const tx = await unirepContractCalledByFisrtAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[0].id = (await unirepContract.attesters(attesters[0]['addr'])).toNumber()
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                await observedGST.insert(leaf)
            }
            expect(observedGST.root).to.be.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
        const secondEpochEpochKeys: string[] = []
        it('begin first epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await ethers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(2)

            unirepState.epochTransition(prevEpoch.toNumber(), [])
        })

        it('First user transition from first epoch', async () => {
            const fromEpoch = users[0].latestTransitionedEpoch
            let oldNullifierTreeRoot = nullifierTree.getRootHash()
            // No attestations made in first epoch, so no nullifiers
            const zeroNullifiers: number[] = []
            for (let i = 0; i < numAttestationsPerBatch; i++) {
                zeroNullifiers[i] = 0
            }

            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            // TODO: allow copying SMT so there are different user state trees for different epochs
            // Currently user state tree is the same so `intermediateUserStateTreeRoots` needs to be
            // kept track of when applying attestations to user state
            const fromEpochUserStateTree: SparseMerkleTreeImpl = await users[0].genUserStateTree()

            const epochKeyNonce = 0
            const intermediateUserStateTreeRoots: BigInt[] = [fromEpochUserStateTree.getRootHash()]
            const oldPosReps: number[] = [], oldNegReps: number[] = [], oldGraffities: BigInt[] = []
            const userStateTreePathElements: any[] = []
            const GSTreeProof = fromEpochGSTree.genMerklePath(users[0].latestGSTLeafIndex)
            const GSTreeRoot = fromEpochGSTree.root
            const selectors: number[] = [], attesterIds: BigInt[] = [], posReps: number[] = [], negReps: number[] = [], graffities: number[] = [], overwriteGraffitis: any[] = []
            const hashChainResult = hashLeftRight(BigInt(1), BigInt(0))  // default hash chain result where no attestations are made to the epoch key
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, fromEpoch, epochKeyNonce, circuitEpochTreeDepth)
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreePathElements = await fromEpochTree.getMerkleProof(firstUserEpochKey)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const nullifierTreePathElements: any[] = []
            // No attestations made in first epoch
            for (let i = 0; i < numAttestationsPerBatch; i++) {
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())
                oldPosReps.push(0)
                oldNegReps.push(0)
                oldGraffities.push(BigInt(0))
                selectors.push(0)
                attesterIds.push(BigInt(0))
                posReps.push(0)
                negReps.push(0)
                graffities.push(0)
                overwriteGraffitis.push(false)

                const USTLeafZeroPathElements = await fromEpochUserStateTree.getMerkleProof(BigInt(0))
                userStateTreePathElements.push(USTLeafZeroPathElements)

                const nullifierTreeProof = await nullifierTree.getMerkleProof(BigInt(0))
                nullifierTreePathElements.push(nullifierTreeProof)    
            }

            const circuitInputs = {
                epoch: fromEpoch,
                nonce: epochKeyNonce,
                max_nonce: maxEpochKeyNonce,
                intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
                old_pos_reps: oldPosReps,
                old_neg_reps: oldNegReps,
                old_graffities: oldGraffities,
                UST_path_elements: userStateTreePathElements,
                identity_pk: users[0].id.keypair.pubKey,
                identity_nullifier: users[0].id.identityNullifier,
                identity_trapdoor: users[0].id.identityTrapdoor,
                GST_path_elements: GSTreeProof.pathElements,
                GST_path_index: GSTreeProof.indices,
                GST_root: GSTreeRoot,
                selectors: selectors,
                attester_ids: attesterIds,
                pos_reps: posReps,
                neg_reps: negReps,
                graffities: graffities,
                overwrite_graffitis: overwriteGraffitis,
                epk_path_elements: epochTreePathElements,
                hash_chain_result: hashChainResult,
                epoch_tree_root: epochTreeRoot,
                nullifier_tree_root: oldNullifierTreeRoot,
                nullifier_tree_path_elements: nullifierTreePathElements
            }
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

            const newHashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    users[0].commitment,
                    fromEpochUserStateTree.getRootHash()
                ]
            )
            const noAttestationNullifier = genNoAttestationNullifierKey(users[0].id.identityNullifier, prevEpoch.toNumber(), epochKeyNonce, circuitNullifierTreeDepth)
            let tx = await unirepContract.updateUserStateRoot(
                newHashedStateLeaf,
                zeroNullifiers,
                noAttestationNullifier,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('Verify state transition of first user', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length).to.be.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length).to.be.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_noAttestationNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid).to.be.true

            // Update nullifier tree
            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            for (const nullifier of nullifiers) {
                if (nullifier > 0) {
                    await nullifierTree.update(BigInt(nullifier), SMT_ONE_LEAF)
                }
            }
            const noAtteNullifier = BigInt(stateTransitionArgs['_noAttestationNullifier'])
            if (noAtteNullifier > 0) {
                await nullifierTree.update(BigInt(noAtteNullifier), SMT_ONE_LEAF)
            }
            allNullifiers.push(noAtteNullifier)


            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)
            expect(nullifierTree.getRootHash() === (await unirepState.genNullifierTree()).getRootHash()).to.be.true

            const GSTreeLeafIndex = 0
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const latestUserStateLeaves = []  // No reputations given yet
            users[0].transition(
                latestTransitionedToEpoch,
                GSTreeLeafIndex,
                latestUserStateLeaves,
            )
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
            const GSTreeLeafIndex = 1
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            users[1] = new UserState(
                circuitUserStateTreeDepth,
                maxEpochKeyNonce,
                numAttestationsPerBatch,
                unirepState,
                id,
                commitment,
                latestTransitionedToEpoch,
                GSTreeLeafIndex,
            )
            userStateLeaves[1] = {}
        })

        it('Second attester signs up', async () => {
            attesters[1] = new Object()
            attesters[1]['acct'] = accounts[2]
            attesters[1]['addr'] = await attesters[1]['acct'].getAddress()
            unirepContractCalledBySecondAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[1]['acct'])
            
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[1].id = (await unirepContract.attesters(attesters[1]['addr'])).toNumber()
        })

        it('Verify epoch key of first user', async () => {
            // First user generates his epoch key
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            // Then generate validity proof of this epoch key
            const user_0_GST_index = users[0].latestGSTLeafIndex
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const GSTProof = GSTree.genMerklePath(user_0_GST_index)
            const circuitInputs = {
                identity_pk: users[0].id.keypair.pubKey,
                identity_nullifier: users[0].id.identityNullifier, 
                identity_trapdoor: users[0].id.identityTrapdoor,
                user_state_root: (await users[0].genUserStateTree()).getRootHash(),
                path_elements: GSTProof.pathElements,
                path_index: GSTProof.indices,
                root: GSTree.root,
                nonce: nonce,
                max_nonce: maxEpochKeyNonce,
                epoch: currentEpoch.toString(),
                epoch_key: firstUserEpochKey,
            }
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyEpochKeyCircuit)
            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

            // Verify on-chain
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                firstUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid).to.be.true
        })

        it('First attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                BigInt(attesters[0].id),
                3,
                1,
                hashOne(graffitiPreImage),
                true,
            )
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            secondEpochEpochKeys.push(firstUserEpochKey.toString())
            unirepState.addAttestation(firstUserEpochKey.toString(), attestation)

            const userStateTree = await users[0].genUserStateTree()
            const oldReps = {
                posRep: 0,
                negRep: 0,
                graffiti: BigInt(0),
                graffitiPreImage: graffitiPreImage
            }
            const newReps = {
                posRep: 0 + attestation['posRep'],
                negRep: 0 + attestation['negRep'],
                graffiti: attestation['overwriteGraffiti'] ? attestation['graffiti'] : BigInt(0),
                graffitiPreImage: attestation['overwriteGraffiti'] ? graffitiPreImage : BigInt(0),
            }
            const nullifier = computeNullifier(users[0].id.identityNullifier, attestation['attesterId'], currentEpoch.toNumber(), circuitNullifierTreeDepth)
            const nullifierTreeProof = await nullifierTree.getMerkleProof(nullifier)
            usersLocalStateTransitionData[0] = new Object()
            const dataForApplyAttestation = {
                attestation: attestation,
                oldReps: oldReps,
                newReps: newReps,
                nullifier: nullifier,
                nullifierTreeProof: nullifierTreeProof
            }
            usersLocalStateTransitionData[0][firstUserEpochKey.toString()] = [dataForApplyAttestation]
            userStateLeaves[0][attestation['attesterId'].toString()] = newReps

            users[0].addEpochKey(firstUserEpochKey.toString())
        })

        it('Verify epoch key of second user', async () => {
            // Second user generates his epoch key
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            // Then generate validity proof of this epoch key
            const user_1_GST_index = 1
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const GSTProof = GSTree.genMerklePath(user_1_GST_index)
            const circuitInputs = {
                identity_pk: users[1].id.keypair.pubKey,
                identity_nullifier: users[1].id.identityNullifier, 
                identity_trapdoor: users[1].id.identityTrapdoor,
                user_state_root: (await users[1].genUserStateTree()).getRootHash(),
                path_elements: GSTProof.pathElements,
                path_index: GSTProof.indices,
                root: GSTree.root,
                nonce: nonce,
                max_nonce: maxEpochKeyNonce,
                epoch: currentEpoch.toString(),
                epoch_key: secondUserEpochKey,
            }
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyEpochKeyCircuit)
            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

            // Verify on-chain
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                secondUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid).to.be.true
        })

        it('First attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                BigInt(attesters[0].id),
                2,
                6,
                hashOne(graffitiPreImage),
                true,
            )
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)

            const userStateTree = await users[1].genUserStateTree()
            const oldReps = {
                posRep: 0,
                negRep: 0,
                graffiti: BigInt(0),
                graffitiPreImage: graffitiPreImage,
            }
            const newReps = {
                posRep: 0 + attestation['posRep'],
                negRep: 0 + attestation['negRep'],
                graffiti: attestation['overwriteGraffiti'] ? attestation['graffiti'] : BigInt(0),
                graffitiPreImage: attestation['overwriteGraffiti'] ? graffitiPreImage : BigInt(0),
            }
            const nullifier = computeNullifier(users[1].id.identityNullifier, attestation['attesterId'], currentEpoch.toNumber(), circuitNullifierTreeDepth)
            const nullifierTreeProof = await nullifierTree.getMerkleProof(nullifier)
            usersLocalStateTransitionData[1] = new Object()
            const dataForApplyAttestation = {
                attestation: attestation,
                oldReps: oldReps,
                newReps: newReps,
                nullifier: nullifier,
                nullifierTreeProof: nullifierTreeProof
            }
            usersLocalStateTransitionData[1][secondUserEpochKey.toString()] = [dataForApplyAttestation]
            userStateLeaves[1][attestation['attesterId'].toString()] = newReps

            users[1].addEpochKey(secondUserEpochKey.toString())
        })

        it('Second attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                BigInt(attesters[1].id),
                0,
                3,
                hashOne(graffitiPreImage),
                true,
            )
            const tx = await unirepContractCalledBySecondAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)

            const userStateTree = await users[1].genUserStateTree()
            const oldReps = usersLocalStateTransitionData[1][secondUserEpochKey.toString()][0]['newReps']
            const newReps = {
                posRep: oldReps['posRep'] + attestation['posRep'],
                negRep: oldReps['negRep'] + attestation['negRep'],
                graffiti: attestation['overwriteGraffiti'] ? attestation['graffiti'] : oldReps['graffiti'],
                graffitiPreImage: attestation['overwriteGraffiti'] ? graffitiPreImage : oldReps['graffitiPreImage'],
            }
            const USTLeafPathElements = await userStateTree.getMerkleProof(attestation['attesterId'])
            const nullifier = computeNullifier(users[1].id.identityNullifier, attestation['attesterId'], currentEpoch.toNumber(), circuitNullifierTreeDepth)
            const nullifierTreeProof = await nullifierTree.getMerkleProof(nullifier)
            const dataForApplyAttestation = {
                attestation: attestation,
                oldReps: oldReps,
                newReps: newReps,
                preApplyUserStateRoot: userStateTree.getRootHash(),
                preApplyUserTreeProof: USTLeafPathElements,
                nullifier: nullifier,
                nullifierTreeProof: nullifierTreeProof
            }
            usersLocalStateTransitionData[1][secondUserEpochKey.toString()].push(dataForApplyAttestation)
            userStateLeaves[1][attestation['attesterId'].toString()] = newReps

            users[1].addEpochKey(secondUserEpochKey.toString())
        })

        it('Attestations gathered from events should match', async () => {
            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            expect(attestationsByEpochEvent.length).to.be.equal(3)

            // Second filter by attester
            for (let attester of attesters) {
                let attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, attester['addr'])
                let attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
                if (attester.id == 1) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(2)
                } else if (attester.id == 2) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(1)
                } else {
                    throw new Error(`Invalid attester id ${attester.id}`)
                }
            }

            // Last filter by epoch key
            for (let epochKey of secondEpochEpochKeys) {
                const epkInHexStr = toCompleteHexString(BigInt(epochKey).toString(16), 32)
                let attestationsByEpochKeyFilter = unirepContract.filters.AttestationSubmitted(null, epkInHexStr)
                let attestationsByEpochKeyEvent = await unirepContract.queryFilter(attestationsByEpochKeyFilter)
                let attestations_: IAttestation[] = attestationsByEpochKeyEvent.map((event: any) => event['args']['attestation'])

                let attestations: IAttestation[] = unirepState.getAttestations(epochKey)
                expect(attestationsByEpochKeyEvent.length).to.be.equal(attestations.length)

                for (let i = 0; i < attestations_.length; i++) {
                    expect(attestations[i]['attesterId']).to.be.equal(attestations_[i]['attesterId'])
                    expect(attestations[i]['posRep']).to.be.equal(attestations_[i]['posRep'])
                    expect(attestations[i]['negRep']).to.be.equal(attestations_[i]['negRep'])
                    expect(attestations[i]['graffiti']).to.be.equal(attestations_[i]['graffiti'])
                    expect(attestations[i]['overwriteGraffiti']).to.be.equal(attestations_[i]['overwriteGraffiti'])
                }
            }
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                await observedGST.insert(leaf)
            }
            expect(observedGST.root).to.be.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    describe('Third epoch', () => {
        it('begin second epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await ethers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(3)

            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(prevEpoch)
            expect(epochKeys_.length).to.be.equal(2)

            epochKeys_ = epochKeys_.map((epk) => epk.toString())
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => hc.toString())
            // Add epoch tree leaves to unirepState
            const epochTreeLeaves: IEpochTreeLeaf[] = []
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(epochKeys_[i]),
                    hashchainResult: BigInt(epochKeyHashchains_[i])
                }
                epochTreeLeaves.push(epochTreeLeaf)
            }

            unirepState.epochTransition(prevEpoch.toNumber(), epochTreeLeaves)
        })

        it('First user transition from second epoch', async () => {
            const fromEpoch = users[0].latestTransitionedEpoch
            const epochKeyNonce = 0
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, fromEpoch, epochKeyNonce, circuitEpochTreeDepth)
            expect(unirepState.getAttestations(firstUserEpochKey.toString()).length).to.be.equal(1)

            const listDataToApplyForEpochKey = usersLocalStateTransitionData[0][firstUserEpochKey.toString()]
            expect(listDataToApplyForEpochKey.length).to.be.equal(1)

            const intermediateUserStateTreeRoots: BigInt[] = []
            const oldPosReps: number[] = [], oldNegReps: number[] = [], oldGraffities: number[] = []
            const selectors: number[] = [], attesterIds: BigInt[] = [], posReps: number[] = [], negReps: number[] = [], graffities: number[] = [], overwriteGraffitis: any[] = []
            const fromEpochUserStateTree =  await users[0].genUserStateTree()
            const userStateTreePathElements: any[] = []
            const fromEpochGSTree = unirepState.genGSTree(Number(fromEpoch))
            const GSTreeProof = fromEpochGSTree.genMerklePath(users[0].latestGSTLeafIndex)
            const GSTreeRoot = fromEpochGSTree.root
            const hashChainResult = unirepState.getHashchain(firstUserEpochKey.toString())
            const fromEpochTree = await unirepState.genEpochTree(Number(fromEpoch))
            const epochTreePathElements = await fromEpochTree.getMerkleProof(firstUserEpochKey)
            const epochTreeRoot = fromEpochTree.getRootHash()
            let oldNullifierTreeRoot = nullifierTree.getRootHash()
            const nullifiers: BigInt[] = []
            const nullifierTreePathElements: any[] = []

            // Fill in data for attestations made
            for (let i = 0; i < listDataToApplyForEpochKey.length; i++) {
                const dataToApply = listDataToApplyForEpochKey[i]
                const attestation = dataToApply['attestation']
                nullifiers.push(dataToApply['nullifier'])
                oldPosReps.push(dataToApply['oldReps']['posRep'])
                oldNegReps.push(dataToApply['oldReps']['negRep'])
                oldGraffities.push(dataToApply['oldReps']['graffiti'])
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())
                const USTLeafPathElements = await fromEpochUserStateTree.getMerkleProof(attestation['attesterId'])
                userStateTreePathElements.push(USTLeafPathElements)
                const newRep = new Reputation(dataToApply['newReps'].posRep, dataToApply['newReps'].negRep, dataToApply['newReps'].graffiti)
                await fromEpochUserStateTree.update(attestation['attesterId'], newRep.hash())
                
                selectors.push(1)
                attesterIds.push(attestation['attesterId'])
                posReps.push(attestation['posRep'])
                negReps.push(attestation['negRep'])
                graffities.push(attestation['graffiti'])
                overwriteGraffitis.push(attestation['overwriteGraffiti'])
                
                nullifierTreePathElements.push(dataToApply['nullifierTreeProof'])
            }
            // Fill in blank data for non-exist attestation
            for (let i = 0; i < (numAttestationsPerBatch - listDataToApplyForEpochKey.length); i++) {
                nullifiers.push(BigInt(0))
                oldPosReps.push(0)
                oldNegReps.push(0)
                oldGraffities.push(0)
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())
                selectors.push(0)
                attesterIds.push(BigInt(0))
                posReps.push(0)
                negReps.push(0)
                graffities.push(0)
                overwriteGraffitis.push(false)

                const USTLeafZeroPathElements = await fromEpochUserStateTree.getMerkleProof(BigInt(0))
                userStateTreePathElements.push(USTLeafZeroPathElements)

                const nullifierTreeProof = await nullifierTree.getMerkleProof(BigInt(0))
                nullifierTreePathElements.push(nullifierTreeProof)    
            }
            // Push one extra intermediate user state root as this would be the latest user state root
            intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())

            const circuitInputs = {
                epoch: fromEpoch,
                nonce: epochKeyNonce,
                max_nonce: maxEpochKeyNonce,
                intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
                old_pos_reps: oldPosReps,
                old_neg_reps: oldNegReps,
                old_graffities: oldGraffities,
                UST_path_elements: userStateTreePathElements,
                identity_pk: users[0].id.keypair.pubKey,
                identity_nullifier: users[0].id.identityNullifier,
                identity_trapdoor: users[0].id.identityTrapdoor,
                GST_path_elements: GSTreeProof.pathElements,
                GST_path_index: GSTreeProof.indices,
                GST_root: GSTreeRoot,
                selectors: selectors,
                attester_ids: attesterIds,
                pos_reps: posReps,
                neg_reps: negReps,
                graffities: graffities,
                overwrite_graffitis: overwriteGraffitis,
                epk_path_elements: epochTreePathElements,
                hash_chain_result: hashChainResult,
                epoch_tree_root: epochTreeRoot,
                nullifier_tree_root: oldNullifierTreeRoot,
                nullifier_tree_path_elements: nullifierTreePathElements
            }
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

            const newHashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    users[0].commitment,
                    fromEpochUserStateTree.getRootHash()
                ]
            )

            const noAtteNullifier = 0
            let tx = await unirepContract.updateUserStateRoot(
                newHashedStateLeaf,
                nullifiers,
                noAtteNullifier,
                fromEpoch,
                fromEpochGSTree.root,
                fromEpochTree.getRootHash(),
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('Verify state transition of first user', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length).to.be.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length).to.be.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_noAttestationNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid).to.be.true

            // Update nullifier tree
            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            for (const nullifier of nullifiers) {
                if (nullifier > 0) {
                    await nullifierTree.update(nullifier, SMT_ONE_LEAF)
                }
            }
            const noAtteNullifier = BigInt(stateTransitionArgs['_noAttestationNullifier'])
            if (noAtteNullifier > 0) {
                await nullifierTree.update(noAtteNullifier, SMT_ONE_LEAF)
            }
            allNullifiers.push(noAtteNullifier)

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)
            expect(nullifierTree.getRootHash() === (await unirepState.genNullifierTree()).getRootHash()).to.be.true

            const GSTreeLeafIndex = 0
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const latestUserStateLeaves: IUserStateLeaf[] = []
            for (const [attesterId, rep] of Object.entries(userStateLeaves[0])) {
                const leaf: IUserStateLeaf = {
                    attesterId: BigInt(attesterId),
                    reputation: new Reputation(rep.posRep, rep.negRep, rep.graffiti)
                }
                latestUserStateLeaves.push(leaf)
            }
    
            users[0].transition(
                latestTransitionedToEpoch,
                GSTreeLeafIndex,
                latestUserStateLeaves,
            )
        })

        it('First user prove his reputation', async () => {
            const attesterId = BigInt(1)  // Prove reputation received from first attester
            const reputationRecord = userStateLeaves[0][attesterId.toString()]
            const posRep = reputationRecord['posRep']
            const negRep = reputationRecord['negRep']
            const graffiti = reputationRecord['graffiti']
            const graffitiPreImage = reputationRecord['graffitiPreImage']
            const userStateTree = await users[0].genUserStateTree()
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const GSTreeProof = GSTree.genMerklePath(users[0].latestGSTLeafIndex)
            const GSTreeRoot = GSTree.root
            const pathElements = await userStateTree.getMerkleProof(attesterId)

            const minPosRep = 1
            const maxNegRep = 10
            const circuitInputs = {
                identity_pk: users[0].id.keypair.pubKey,
                identity_nullifier: users[0].id.identityNullifier, 
                identity_trapdoor: users[0].id.identityTrapdoor,
                user_state_root: userStateTree.getRootHash(),
                GST_path_index: GSTreeProof.indices,
                GST_path_elements: GSTreeProof.pathElements,
                GST_root: GSTreeRoot,
                attester_id: attesterId,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                UST_path_elements: pathElements,
                min_pos_rep: minPosRep,
                max_neg_rep: maxNegRep,
                graffiti_pre_image: graffitiPreImage
            }

            const startTime = Math.floor(new Date().getTime() / 1000)
            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyReputationCircuit)
            const endTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

            // Verify on-chain
            const isProofValid = await unirepContract.verifyReputation(
                GSTreeRoot,
                attesterId,
                minPosRep,
                maxNegRep,
                graffitiPreImage,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid).to.be.true
        })
    })
})