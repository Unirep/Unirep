import { ethers } from "@nomiclabs/buidler"
import { BigNumber, Contract, Signer, Wallet } from "ethers"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, maxEpochKeyNonce, numAttestationsPerBatch} from '../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, SnarkBigInt, genRandomSalt, stringifyBigInts, hashLeftRight, hashOne } from 'maci-crypto'
import { deployUnirep, genNoAttestationNullifierKey, genEpochKey, toCompleteHexString, computeNullifier, genNewEpochTree, genNewNullifierTree, genNewUserStateTree, SMT_ONE_LEAF, computeReputationHash } from './utils'

chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"
import { SparseMerkleTreeImpl } from "../crypto/SMT"
import { compileAndLoadCircuit, formatProofForVerifierContract, genVerifyEpochKeyProofAndPublicSignals, genVerifyReputationProofAndPublicSignals, genVerifyUserStateTransitionProofAndPublicSignals, verifyEPKProof, verifyProveReputationProof, verifyUserStateTransitionProof } from "./circuits/utils"

describe('Integration', function () {
    this.timeout(500000)

    let users = new Array(2)
    let epochKeyToAttestationsMap = {}
    let epochKeyToHashchainMap = {}

    let attesters = new Array(2)
    let unirepContractCalledByFisrtAttester, unirepContractCalledBySecondAttester

    let unirepContract: Contract
    let prevEpoch: BigNumber
    let currentEpoch: BigNumber
    let GSTrees: {[key: string]: IncrementalQuinTree} = {}  // epoch -> GSTree
    let blankGSLeaf: SnarkBigInt
    let epochTrees: {[key: string]: SparseMerkleTreeImpl} = {}  // epoch -> epochTree
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

        blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTrees[currentEpoch.toString()] = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)

        nullifierTree = await genNewNullifierTree("circuit")
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            users[0] = new Object()
            users[0]['id'] = id
            users[0]['commitment'] = commitment

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            users[0]['userStateTree'] = await genNewUserStateTree("circuit")
            users[0]['userStateTreeRoot'] = new Object()
            users[0]['userStateTreeRoot'][currentEpoch.toString()] = users[0]['userStateTree'].getRootHash()
            users[0]['userStateLeaves'] = new Object()
            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    users[0]['userStateTreeRoot'][currentEpoch.toString()]
                ]
            )
            GSTrees[currentEpoch.toString()].insert(hashedStateLeaf)
            users[0]['GSTreeLeafIndex'] = new Object()
            users[0]['GSTreeLeafIndex'][currentEpoch.toString()] = 0
            users[0]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })

        it('First attester signs up', async () => {
            attesters[0] = new Object()
            attesters[0]['acct'] = accounts[1]
            attesters[0]['addr'] = await attesters[0]['acct'].getAddress()
            unirepContractCalledByFisrtAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[0]['acct'])

            const tx = await unirepContractCalledByFisrtAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[0]['id'] = (await unirepContract.attesters(attesters[0]['addr'])).toNumber()
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                await observedGST.insert(leaf)
            }
            expect(observedGST.root).to.be.equal(GSTrees[currentEpoch.toString()].root)
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
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

            epochTrees[prevEpoch.toString()] = await genNewEpochTree("circuit")

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(2)
        })

        it('First user transition from first epoch', async () => {
            const fromEpoch = users[0]['latestTransitionedToEpoch']
            let oldNullifierTreeRoot = nullifierTree.getRootHash()
            // No attestations made in first epoch, so no nullifiers
            const zeroNullifiers: number[] = []
            for (let i = 0; i < numAttestationsPerBatch; i++) {
                zeroNullifiers[i] = 0
            }

            // No attestations made in first epoch, so user state remains the same
            users[0]['userStateTreeRoot'][currentEpoch.toString()] = users[0]['userStateTreeRoot'][fromEpoch]

            // TODO: allow copying SMT so there are different user state trees for different epochs
            // Currently user state tree is the same so `intermediateUserStateTreeRoots` needs to be
            // kept track of when applying attestations to user state
            const fromEpochUserStateTree: SparseMerkleTreeImpl = users[0]['userStateTree']

            const epochKeyNonce = 0
            const intermediateUserStateTreeRoots: BigInt[] = [fromEpochUserStateTree.getRootHash()]
            const oldPosReps: number[] = [], oldNegReps: number[] = [], oldGraffities: number[] = []
            const userStateTreePathElements: any[] = []
            const GSTreeProof = GSTrees[fromEpoch].genMerklePath(users[0]['GSTreeLeafIndex'][fromEpoch])
            const GSTreeRoot = GSTrees[fromEpoch].root
            const selectors: number[] = [], attesterIds: number[] = [], posReps: number[] = [], negReps: number[] = [], graffities: number[] = [], overwriteGraffitis: any[] = []
            const hashChainResult = hashLeftRight(BigInt(1), BigInt(0))  // default hash chain result where no attestations are made to the epoch key
            const firstUserEpochKey = genEpochKey(users[0]['id'].identityNullifier, parseInt(fromEpoch), epochKeyNonce, circuitEpochTreeDepth)
            const epochTreePathElements = await epochTrees[fromEpoch].getMerkleProof(BigNumber.from(firstUserEpochKey))
            const epochTreeRoot = epochTrees[fromEpoch].getRootHash()
            const nullifierTreePathElements: any[] = []
            // No attestations made in first epoch
            for (let i = 0; i < numAttestationsPerBatch; i++) {
                intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())
                oldPosReps.push(0)
                oldNegReps.push(0)
                oldGraffities.push(0)
                selectors.push(0)
                attesterIds.push(0)
                posReps.push(0)
                negReps.push(0)
                graffities.push(0)
                overwriteGraffitis.push(false)

                const USTLeafZeroPathElements = await fromEpochUserStateTree.getMerkleProof(BigNumber.from(0))
                userStateTreePathElements.push(USTLeafZeroPathElements)

                const nullifierTreeProof = await nullifierTree.getMerkleProof(BigNumber.from(0))
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
                identity_pk: users[0]['id']['keypair']['pubKey'],
                identity_nullifier: users[0]['id']['identityNullifier'],
                identity_trapdoor: users[0]['id']['identityTrapdoor'],
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
                    users[0]['commitment'],
                    users[0]['userStateTreeRoot'][fromEpoch]
                ]
            )
            const noAttestationNullifier = genNoAttestationNullifierKey(users[0]['id']['identityNullifier'], prevEpoch.toNumber(), epochKeyNonce, circuitNullifierTreeDepth)
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
            const nullifiers = stateTransitionArgs['_nullifiers']
            for (const nullifier of nullifiers) {
                if (nullifier.gt(0)) {
                    await nullifierTree.update(nullifier, SMT_ONE_LEAF)
                }
            }
            const noAtteNullifier = BigNumber.from(stateTransitionArgs['_noAttestationNullifier'].toString())
            if (noAtteNullifier.gt(0)) {
                await nullifierTree.update(noAtteNullifier, SMT_ONE_LEAF)
            }

            // Update GST
            GSTrees[currentEpoch.toString()] = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            users[0]['GSTreeLeafIndex'][currentEpoch.toString()] = 0
            GSTrees[currentEpoch.toString()].insert(newGSTLeafArgs['_hashedLeaf'])

            users[0]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            users[1] = new Object()
            users[1]['id'] = id
            users[1]['commitment'] = commitment

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            users[1]['userStateTree'] = await genNewUserStateTree("circuit")
            users[1]['userStateTreeRoot'] = new Object()
            users[1]['userStateTreeRoot'][currentEpoch.toString()] = users[1]['userStateTree'].getRootHash()
            users[1]['userStateLeaves'] = new Object()
            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    users[1]['userStateTreeRoot'][currentEpoch.toString()]
                ]
            )
            GSTrees[currentEpoch.toString()].insert(hashedStateLeaf)
            users[1]['GSTreeLeafIndex'] = new Object()
            users[1]['GSTreeLeafIndex'][currentEpoch.toString()] = 1
            users[1]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })

        it('Second attester signs up', async () => {
            attesters[1] = new Object()
            attesters[1]['acct'] = accounts[2]
            attesters[1]['addr'] = await attesters[1]['acct'].getAddress()
            unirepContractCalledBySecondAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[1]['acct'])
            
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[1]['id'] = (await unirepContract.attesters(attesters[1]['addr'])).toNumber()
        })

        it('Verify epoch key of first user', async () => {
            // First user generates his epoch key
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0]['id'].identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            // Then generate validity proof of this epoch key
            const user_0_GST_index = 0
            const GSTProof = GSTrees[currentEpoch.toString()].genMerklePath(user_0_GST_index)
            const circuitInputs = {
                identity_pk: users[0]['id']['keypair']['pubKey'],
                identity_nullifier: users[0]['id']['identityNullifier'], 
                identity_trapdoor: users[0]['id']['identityTrapdoor'],
                user_state_root: users[0]['userStateTreeRoot'][currentEpoch.toString()],
                path_elements: GSTProof.pathElements,
                path_index: GSTProof.indices,
                root: GSTrees[currentEpoch.toString()].root,
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
                GSTrees[currentEpoch.toString()].root,
                currentEpoch,
                firstUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid).to.be.true
        })

        it('First attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0]['id'].identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation = {
                attesterId: attesters[0]['id'],
                posRep: 3,
                negRep: 1,
                graffiti: hashOne(graffitiPreImage),
                overwriteGraffiti: true,
            }
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            epochKeyToAttestationsMap[firstUserEpochKey.toString()] = new Array()
            epochKeyToAttestationsMap[firstUserEpochKey.toString()].push(attestation)

            // Update user local state
            const userStateTree = users[0]['userStateTree']
            const oldReps = {
                posRep: 0,
                negRep: 0,
                graffiti: 0,
                graffitiPreImage: graffitiPreImage
            }
            const newReps = {
                posRep: 0 + attestation['posRep'],
                negRep: 0 + attestation['negRep'],
                graffiti: attestation['overwriteGraffiti'] ? attestation['graffiti'] : 0,
                graffitiPreImage: attestation['overwriteGraffiti'] ? graffitiPreImage : 0,
            }
            const oldRepsHash = computeReputationHash(oldReps)
            const newRepsHash = computeReputationHash(newReps)
            const USTLeafPathElements = await userStateTree.getMerkleProof(BigNumber.from(attestation['attesterId']))
            const nullifier = computeNullifier(users[0]['id'].identityNullifier, attestation['attesterId'], currentEpoch.toNumber(), circuitNullifierTreeDepth)
            const nullifierTreeProof = await nullifierTree.getMerkleProof(BigNumber.from(nullifier))
            usersLocalStateTransitionData[0] = new Object()
            const dataForApplyAttestation = {
                attestation: attestation,
                oldReps: oldReps,
                newReps: newReps,
                preApplyUserStateRoot: users[0]['userStateTreeRoot'][currentEpoch.toString()],
                preApplyUserTreeProof: USTLeafPathElements,
                nullifier: nullifier,
                nullifierTreeProof: nullifierTreeProof
            }
            usersLocalStateTransitionData[0][firstUserEpochKey.toString()] = [dataForApplyAttestation]
            // Update user state tree
            users[0]['userStateLeaves'][attestation['attesterId']] = newReps
            await userStateTree.update(BigNumber.from(attestation['attesterId']), newRepsHash)
            users[0]['userStateTreeRoot'][currentEpoch.toString()] = users[0]['userStateTree'].getRootHash()
        })

        it('Verify epoch key of second user', async () => {
            // Second user generates his epoch key
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1]['id'].identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            // Then generate validity proof of this epoch key
            const user_1_GST_index = 1
            const GSTProof = GSTrees[currentEpoch.toString()].genMerklePath(user_1_GST_index)
            const circuitInputs = {
                identity_pk: users[1]['id']['keypair']['pubKey'],
                identity_nullifier: users[1]['id']['identityNullifier'], 
                identity_trapdoor: users[1]['id']['identityTrapdoor'],
                user_state_root: users[1]['userStateTreeRoot'][currentEpoch.toString()],
                path_elements: GSTProof.pathElements,
                path_index: GSTProof.indices,
                root: GSTrees[currentEpoch.toString()].root,
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
                GSTrees[currentEpoch.toString()].root,
                currentEpoch,
                secondUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid).to.be.true
        })

        it('First attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1]['id'].identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation = {
                attesterId: attesters[0]['id'],
                posRep: 2,
                negRep: 6,
                graffiti: hashOne(graffitiPreImage),
                overwriteGraffiti: true,
            }
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            epochKeyToAttestationsMap[secondUserEpochKey.toString()] = new Array()
            epochKeyToAttestationsMap[secondUserEpochKey.toString()].push(attestation)

            // Update user local state
            const userStateTree = users[1]['userStateTree']
            const oldReps = {
                posRep: 0,
                negRep: 0,
                graffiti: 0,
                graffitiPreImage: graffitiPreImage,
            }
            const newReps = {
                posRep: 0 + attestation['posRep'],
                negRep: 0 + attestation['negRep'],
                graffiti: attestation['overwriteGraffiti'] ? attestation['graffiti'] : 0,
                graffitiPreImage: attestation['overwriteGraffiti'] ? graffitiPreImage : 0,
            }
            const oldRepsHash = computeReputationHash(oldReps)
            const newRepsHash = computeReputationHash(newReps)
            const USTLeafPathElements = await userStateTree.getMerkleProof(BigNumber.from(attestation['attesterId']))
            const nullifier = computeNullifier(users[1]['id'].identityNullifier, attestation['attesterId'], currentEpoch.toNumber(), circuitNullifierTreeDepth)
            const nullifierTreeProof = await nullifierTree.getMerkleProof(BigNumber.from(nullifier))
            usersLocalStateTransitionData[1] = new Object()
            const dataForApplyAttestation = {
                attestation: attestation,
                oldReps: oldReps,
                newReps: newReps,
                preApplyUserStateRoot: users[1]['userStateTreeRoot'][currentEpoch.toString()],
                preApplyUserTreeProof: USTLeafPathElements,
                nullifier: nullifier,
                nullifierTreeProof: nullifierTreeProof
            }
            usersLocalStateTransitionData[1][secondUserEpochKey.toString()] = [dataForApplyAttestation]
            // Update user state tree
            users[1]['userStateLeaves'][attestation['attesterId']] = newReps
            await userStateTree.update(BigNumber.from(attestation['attesterId']), newRepsHash)
            users[1]['userStateTreeRoot'][currentEpoch.toString()] = users[1]['userStateTree'].getRootHash()
        })

        it('Second attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1]['id'].identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation = {
                attesterId: attesters[1]['id'],
                posRep: 0,
                negRep: 3,
                graffiti: hashOne(graffitiPreImage),
                overwriteGraffiti: true,
            }
            const tx = await unirepContractCalledBySecondAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            epochKeyToAttestationsMap[secondUserEpochKey.toString()].push(attestation)

            // Update user local state
            const userStateTree = users[1]['userStateTree']
            const oldReps = usersLocalStateTransitionData[1][secondUserEpochKey.toString()][0]['newReps']
            const newReps = {
                posRep: oldReps['posRep'] + attestation['posRep'],
                negRep: oldReps['negRep'] + attestation['negRep'],
                graffiti: attestation['overwriteGraffiti'] ? attestation['graffiti'] : oldReps['graffiti'],
                graffitiPreImage: attestation['overwriteGraffiti'] ? graffitiPreImage : oldReps['graffitiPreImage'],
            }
            const oldRepsHash = computeReputationHash(oldReps)
            const newRepsHash = computeReputationHash(newReps)
            const USTLeafPathElements = await userStateTree.getMerkleProof(BigNumber.from(attestation['attesterId']))
            const nullifier = computeNullifier(users[1]['id'].identityNullifier, attestation['attesterId'], currentEpoch.toNumber(), circuitNullifierTreeDepth)
            const nullifierTreeProof = await nullifierTree.getMerkleProof(BigNumber.from(nullifier))
            const dataForApplyAttestation = {
                attestation: attestation,
                oldReps: oldReps,
                newReps: newReps,
                preApplyUserStateRoot: users[1]['userStateTreeRoot'][currentEpoch.toString()],
                preApplyUserTreeProof: USTLeafPathElements,
                nullifier: nullifier,
                nullifierTreeProof: nullifierTreeProof
            }
            usersLocalStateTransitionData[1][secondUserEpochKey.toString()].push(dataForApplyAttestation)
            // Update user state tree
            users[1]['userStateLeaves'][attestation['attesterId']] = newReps
            await userStateTree.update(BigNumber.from(attestation['attesterId']), newRepsHash)
            users[1]['userStateTreeRoot'][currentEpoch.toString()] = users[1]['userStateTree'].getRootHash()
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
                if (attester['id'] == 1) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(2)
                } else if (attester['id'] == 2) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(1)
                } else {
                    throw new Error(`Invalid attester id ${attester['id']}`)
                }
            }

            // Last filter by epoch key
            for (let epochKey in epochKeyToAttestationsMap) {
                const epkInHexStr = toCompleteHexString(BigInt(epochKey).toString(16), 32)
                let attestationsByEpochKeyFilter = unirepContract.filters.AttestationSubmitted(null, epkInHexStr)
                let attestationsByEpochKeyEvent = await unirepContract.queryFilter(attestationsByEpochKeyFilter)
                expect(attestationsByEpochKeyEvent.length).to.be.equal(epochKeyToAttestationsMap[epochKey].length)
                let attestations_: any[] = attestationsByEpochKeyEvent.map((event: any) => event['args']['attestation'])
                let attestations: any[] = Object.values(epochKeyToAttestationsMap[epochKey])

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
            expect(observedGST.root).to.be.equal(GSTrees[currentEpoch.toString()].root)
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

            epochTrees[prevEpoch.toString()] = await genNewEpochTree("circuit")

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(3)

            // Update epoch tree
            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(prevEpoch)
            expect(epochKeys_.length).to.be.equal(2)

            epochKeys_ = epochKeys_.map((epk) => epk.toString())
            // Fill in epoch key to hash chain result map
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => hc.toString())
            for (let i = 0; i < epochKeys_.length; i++) {
                epochKeyToHashchainMap[epochKeys_[i]] = epochKeyHashchains_[i]
            }
            // Update epoch tree
            for (let i = 0; i < epochKeys_.length; i++) {
                await epochTrees[prevEpoch.toString()].update(BigNumber.from(epochKeys_[i]), BigInt(epochKeyHashchains_[i]))
            }
        })

        it('First user transition from second epoch', async () => {
            const fromEpoch = users[0]['latestTransitionedToEpoch']
            const epochKeyNonce = 0
            const firstUserEpochKey = genEpochKey(users[0]['id'].identityNullifier, parseInt(fromEpoch), epochKeyNonce, circuitEpochTreeDepth)
            expect(epochKeyToAttestationsMap[firstUserEpochKey.toString()].length).to.be.equal(1)

            const listDataToApplyForEpochKey = usersLocalStateTransitionData[0][firstUserEpochKey.toString()]
            expect(listDataToApplyForEpochKey.length).to.be.equal(1)

            const intermediateUserStateTreeRoots: BigInt[] = []
            const oldPosReps: number[] = [], oldNegReps: number[] = [], oldGraffities: number[] = []
            const selectors: number[] = [], attesterIds: number[] = [], posReps: number[] = [], negReps: number[] = [], graffities: number[] = [], overwriteGraffitis: any[] = []
            const userStateTreePathElements: any[] = []
            const GSTreeProof = GSTrees[fromEpoch].genMerklePath(users[0]['GSTreeLeafIndex'][fromEpoch])
            const GSTreeRoot = GSTrees[fromEpoch].root
            const hashChainResult = BigInt(epochKeyToHashchainMap[firstUserEpochKey.toString()])
            const epochTreePathElements = await epochTrees[fromEpoch].getMerkleProof(BigNumber.from(firstUserEpochKey))
            const epochTreeRoot = epochTrees[fromEpoch].getRootHash()
            let oldNullifierTreeRoot = nullifierTree.getRootHash()
            const nullifiers: BigInt[] = []
            const nullifierTreePathElements: any[] = []

            // Fill in data for attestations made
            for (let i = 0; i < listDataToApplyForEpochKey.length; i++) {
                const dataToApply = listDataToApplyForEpochKey[i]
                const attestation = dataToApply['attestation']
                // const attestationNullifier = computeNullifier(users[0]['id']['identityNullifier'], attestation['attesterId'], parseInt(fromEpoch), circuitNullifierTreeDepth)
                nullifiers.push(dataToApply['nullifier'])
                oldPosReps.push(dataToApply['oldReps']['posRep'])
                oldNegReps.push(dataToApply['oldReps']['negRep'])
                oldGraffities.push(dataToApply['oldReps']['graffiti'])
                intermediateUserStateTreeRoots.push(dataToApply['preApplyUserStateRoot'])

                selectors.push(1)
                attesterIds.push(attestation['attesterId'])
                posReps.push(attestation['posRep'])
                negReps.push(attestation['negRep'])
                graffities.push(attestation['graffiti'])
                overwriteGraffitis.push(attestation['overwriteGraffiti'])

                userStateTreePathElements.push(dataToApply['preApplyUserTreeProof'])
                nullifierTreePathElements.push(dataToApply['nullifierTreeProof'])
            }
            // Fill in blank data for non-exist attestation
            const LatestUserStateTree = users[0]['userStateTree']
            for (let i = 0; i < (numAttestationsPerBatch - listDataToApplyForEpochKey.length); i++) {
                nullifiers.push(BigInt(0))
                oldPosReps.push(0)
                oldNegReps.push(0)
                oldGraffities.push(0)
                intermediateUserStateTreeRoots.push(LatestUserStateTree.getRootHash())
                selectors.push(0)
                attesterIds.push(0)
                posReps.push(0)
                negReps.push(0)
                graffities.push(0)
                overwriteGraffitis.push(false)

                const USTLeafZeroPathElements = await LatestUserStateTree.getMerkleProof(BigNumber.from(0))
                userStateTreePathElements.push(USTLeafZeroPathElements)

                const nullifierTreeProof = await nullifierTree.getMerkleProof(BigNumber.from(0))
                nullifierTreePathElements.push(nullifierTreeProof)    
            }
            // Push one extra intermediate user state root as this would be the latest user state root
            intermediateUserStateTreeRoots.push(LatestUserStateTree.getRootHash())

            const circuitInputs = {
                epoch: fromEpoch,
                nonce: epochKeyNonce,
                max_nonce: maxEpochKeyNonce,
                intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
                old_pos_reps: oldPosReps,
                old_neg_reps: oldNegReps,
                old_graffities: oldGraffities,
                UST_path_elements: userStateTreePathElements,
                identity_pk: users[0]['id']['keypair']['pubKey'],
                identity_nullifier: users[0]['id']['identityNullifier'],
                identity_trapdoor: users[0]['id']['identityTrapdoor'],
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

            users[0]['userStateTreeRoot'][currentEpoch.toString()] = users[0]['userStateTreeRoot'][fromEpoch]
            const newHashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    users[0]['commitment'],
                    users[0]['userStateTreeRoot'][fromEpoch]
                ]
            )

            const noAtteNullifier = 0
            let tx = await unirepContract.updateUserStateRoot(
                newHashedStateLeaf,
                nullifiers,
                noAtteNullifier,
                fromEpoch,
                GSTrees[fromEpoch].root,
                epochTrees[fromEpoch].getRootHash(),
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
            const nullifiers = stateTransitionArgs['_nullifiers']
            for (const nullifier of nullifiers) {
                if (nullifier.gt(0)) {
                    await nullifierTree.update(nullifier, SMT_ONE_LEAF)
                }
            }
            const noAtteNullifier = stateTransitionArgs['_noAttestationNullifier']
            if (noAtteNullifier.gt(0)) {
                await nullifierTree.update(noAtteNullifier, SMT_ONE_LEAF)
            }

            // Update GST
            GSTrees[currentEpoch.toString()] = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            GSTrees[currentEpoch.toString()].insert(newGSTLeafArgs['_hashedLeaf'])
            users[0]['GSTreeLeafIndex'][currentEpoch.toString()] = 0

            users[0]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })

        it('First user prove his reputation', async () => {
            const attesterId = 1  // Prove reputation received from first attester
            const reputationRecord = users[0]['userStateLeaves'][attesterId]
            const posRep = reputationRecord['posRep']
            const negRep = reputationRecord['negRep']
            const graffiti = reputationRecord['graffiti']
            const graffitiPreImage = reputationRecord['graffitiPreImage']
            const userStateTree = users[0]['userStateTree']
            const GSTreeProof = GSTrees[currentEpoch.toString()].genMerklePath(users[0]['GSTreeLeafIndex'][currentEpoch.toString()])
            const GSTreeRoot = GSTrees[currentEpoch.toString()].root
            const reputationRecordHash = computeReputationHash(reputationRecord)
            const pathElements = await userStateTree.getMerkleProof(BigNumber.from(attesterId), reputationRecordHash)

            const minPosRep = 1
            const maxNegRep = 10
            const circuitInputs = {
                identity_pk: users[0]['id']['keypair']['pubKey'],
                identity_nullifier: users[0]['id']['identityNullifier'], 
                identity_trapdoor: users[0]['id']['identityTrapdoor'],
                user_state_root: users[0]['userStateTreeRoot'][currentEpoch.toString()],
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