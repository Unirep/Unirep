import chai from "chai"

const { expect } = chai

import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import {
    IncrementalQuinTree,
    SnarkBigInt,
    genRandomSalt,
    hash5,
    hashLeftRight,
    stringifyBigInts,
} from 'maci-crypto'

import {
    compileAndLoadCircuit,
    executeCircuit,
    genVerifyUserStateTransitionProofAndPublicSignals,
    verifyUserStateTransitionProof,
    getSignalByName,
} from './utils'
import { circuitEpochTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, globalStateTreeDepth } from "../../config/testLocal"
import { computeAttestationHash, genEpochKey, computeNullifier, genNewEpochTree, genNewNullifierTree, genNewUserStateTree } from "../utils"
import { SparseMerkleTreeImpl } from "../../crypto/SMT"

describe('User State Transition circuits', function () {
    this.timeout(400000)

    const epoch = 1
    const nonce = 2
    const user = genIdentity()
    const epochKey: SnarkBigInt = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)

    describe('Epoch key exists', () => {

        let circuit

        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements

        let hashChainResult: SnarkBigInt

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/epochKeyExists_test.circom')
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

            // Epoch tree
            epochTree = await genNewEpochTree("circuit")

            hashChainResult = genRandomSalt()

            await epochTree.update(epochKey, hashChainResult)
            
            epochTreePathElements = await epochTree.getMerkleProof(epochKey)
            epochTreeRoot = epochTree.getRootHash()
        })

        it('Existed epoch key should pass check', async () => {
            const circuitInputs = {
                identity_nullifier: user['identityNullifier'],
                epoch: epoch,
                nonce: nonce,
                hash_chain_result: hashChainResult,
                epoch_tree_root: epochTreeRoot,
                path_elements: epochTreePathElements
            }

            const witness = await executeCircuit(circuit, circuitInputs)
        })
    })

    describe('User State Transition', () => {

        let circuit

        const MAX_NONCE = 2
        const NUM_ATTESTATIONS = 10


        let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, GSTreeProof, newGSTLeaf
        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements
        let nullifierTree: SparseMerkleTreeImpl, nullifierTreeRoot, nullifierTreePathElements
        let userStateTree: SparseMerkleTreeImpl
        let intermediateUserStateTreeRoots, userStateTreePathElements, noAttestationUserStateTreePathElements
        let oldPosReps, oldNegReps, oldGraffities

        let attestationRecords = {}
        let attesterIds: number[], posReps: number[], negReps: number[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
        let selectors: number[] = []
        let nullifiers: SnarkBigInt[]
        let hashChainResult: SnarkBigInt

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

            // Epoch tree
            epochTree = await genNewEpochTree("circuit")

            // Nullifier tree
            nullifierTreePathElements = []
            nullifierTree = await genNewNullifierTree("circuit")
            nullifierTreeRoot = nullifierTree.getRootHash()

            // User state tree
            userStateTree = await genNewUserStateTree("circuit")
            intermediateUserStateTreeRoots = []
            userStateTreePathElements = []
            noAttestationUserStateTreePathElements = []
            oldPosReps = []
            oldNegReps = []
            oldGraffities = []

            // Bootstrap user state
            for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                const  attesterId = i + 1
                if (attestationRecords[attesterId] === undefined) {
                    attestationRecords[attesterId] = {
                        posRep: Math.floor(Math.random() * 100),
                        negRep: Math.floor(Math.random() * 100),
                        graffiti: genRandomSalt(),
                    }
                }
                const newAttestationRecordHash = hash5([
                    attestationRecords[attesterId]['posRep'],
                    attestationRecords[attesterId]['negRep'],
                    attestationRecords[attesterId]['graffiti'],
                    BigInt(0),
                    BigInt(0)
                ])
                await userStateTree.update(BigInt(attesterId), newAttestationRecordHash)
            }
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
            const USTLeafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
            for (let i = 0; i < NUM_ATTESTATIONS; i++) noAttestationUserStateTreePathElements.push(USTLeafZeroPathElements)

            // Global state tree
            GSTree = new IncrementalQuinTree(globalStateTreeDepth, GSTZERO_VALUE, 2)
            const commitment = genIdentityCommitment(user)
            const hashedStateLeaf = hashLeftRight(commitment, userStateTree.getRootHash())
            GSTree.insert(hashedStateLeaf)
            GSTreeProof = GSTree.genMerklePath(0)
            GSTreeRoot = GSTree.root

            attesterIds = []
            posReps = []
            negReps = []
            graffities = []
            overwriteGraffitis = []

            // Ensure as least one of the selectors is true
            const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS)
            for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                if (i == selTrue) selectors.push(1)
                else selectors.push(Math.floor(Math.random() * 2))
            }

            nullifiers = []
            hashChainResult = BigInt(0)
            for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                const attestation = {
                    attesterId: i + 1,
                    posRep: Math.floor(Math.random() * 100),
                    negRep: Math.floor(Math.random() * 100),
                    graffiti: genRandomSalt(),
                    overwriteGraffiti: true,
                }
                attesterIds.push(attestation['attesterId'])
                posReps.push(attestation['posRep'])
                negReps.push(attestation['negRep'])
                graffities.push(attestation['graffiti'])
                overwriteGraffitis.push(attestation['overwriteGraffiti'])

                oldPosReps.push(attestationRecords[attestation['attesterId']]['posRep'])
                oldNegReps.push(attestationRecords[attestation['attesterId']]['negRep'])
                oldGraffities.push(attestationRecords[attestation['attesterId']]['graffiti'])

                // If nullifier tree is too small, it's likely that nullifier would be zero.
                // In this case, force selector to be zero.
                const nullifier = computeNullifier(user['identityNullifier'], attestation['attesterId'], epoch, circuitNullifierTreeDepth)
                if ( nullifier == BigInt(0) ) {
                    selectors[i] = 0
                    // If unfortunately this is the selector forced to be true,
                    // then we force next selector to be true instead.
                    if (i == selTrue) selectors[i + 1] = 1
                }

                if ( selectors[i] == 1) {
                    // Get old attestation record
                    const oldAttestationRecord = hash5([
                        attestationRecords[attestation['attesterId']]['posRep'],
                        attestationRecords[attestation['attesterId']]['negRep'],
                        attestationRecords[attestation['attesterId']]['graffiti'],
                        BigInt(0),
                        BigInt(0)
                    ])
                    const oldAttestationRecordProof = await userStateTree.getMerkleProof(BigInt(attestation['attesterId']))
                    userStateTreePathElements.push(oldAttestationRecordProof)

                    // Update attestation record
                    attestationRecords[attestation['attesterId']]['posRep'] += attestation['posRep']
                    attestationRecords[attestation['attesterId']]['negRep'] += attestation['negRep']
                    if (attestation['overwriteGraffiti']) attestationRecords[attestation['attesterId']]['graffiti'] = attestation['graffiti']
                    const newAttestationRecordHash = hash5([
                        attestationRecords[attestation['attesterId']]['posRep'],
                        attestationRecords[attestation['attesterId']]['negRep'],
                        attestationRecords[attestation['attesterId']]['graffiti'],
                        BigInt(0),
                        BigInt(0)
                    ])
                    await userStateTree.update(BigInt(attestation['attesterId']), newAttestationRecordHash)

                    const attestation_hash = computeAttestationHash(attestation)
                    hashChainResult = hashLeftRight(attestation_hash, hashChainResult)

                    nullifiers.push(nullifier)
                    const nullifierTreeProof = await nullifierTree.getMerkleProof(nullifier)
                    nullifierTreePathElements.push(nullifierTreeProof)
                } else {
                    const USTLeafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                    userStateTreePathElements.push(USTLeafZeroPathElements)

                    nullifiers.push(BigInt(0))
                    const nullifierTreeProof = await nullifierTree.getMerkleProof(BigInt(0))
                    nullifierTreePathElements.push(nullifierTreeProof)
                }
                intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
            }
            hashChainResult = hashLeftRight(BigInt(1), hashChainResult)

            newGSTLeaf = hashLeftRight(commitment, intermediateUserStateTreeRoots[NUM_ATTESTATIONS])

            await epochTree.update(epochKey, hashChainResult)
            
            epochTreePathElements = await epochTree.getMerkleProof(epochKey)
            epochTreeRoot = epochTree.getRootHash()
        })

        it('Valid user state update inputs should work', async () => {
            const circuitInputs = {
                epoch: epoch,
                nonce: nonce,
                max_nonce: MAX_NONCE,
                intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
                old_pos_reps: oldPosReps,
                old_neg_reps: oldNegReps,
                old_graffities: oldGraffities,
                UST_path_elements: userStateTreePathElements,
                identity_pk: user['keypair']['pubKey'],
                identity_nullifier: user['identityNullifier'],
                identity_trapdoor: user['identityTrapdoor'],
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
                nullifier_tree_root: nullifierTreeRoot,
                nullifier_tree_path_elements: nullifierTreePathElements
            }

            const witness = await executeCircuit(circuit, circuitInputs)
            for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
                expect(nullifier).to.equal(nullifiers[i])
            }
            const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
            expect(_newGSTLeaf).to.equal(newGSTLeaf)

            const startTime = Math.floor(new Date().getTime() / 1000)
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), circuit)
            const endTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true
        })
    })
})