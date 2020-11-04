import { BigNumber } from "ethers"
import chai from "chai"

const { expect } = chai

import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import {
    IncrementalQuinTree,
    SnarkBigInt,
    genRandomSalt,
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
import { circuitEpochTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, globalStateTreeDepth, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch } from "../../config/testLocal"
import { genEpochKey, genAttestationNullifier, genNewEpochTree, genNewNullifierTree, genNewUserStateTree, genEpochKeyNullifier, SMT_ONE_LEAF } from "../utils"
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { Attestation, Reputation } from "../../core"

describe('User State Transition circuits', function () {
    this.timeout(600000)

    const epoch = 1
    const user = genIdentity()

    describe('Epoch key exists', () => {

        let circuit

        const nonce = numEpochKeyNoncePerEpoch - 1
        const epochKey: SnarkBigInt = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)

        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements

        let hashChainResult: SnarkBigInt

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/epochKeyExists_test.circom')
            console.log(circuit)
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

        // const MAX_NONCE = numEpochKeyNoncePerEpoch
        // const ATTESTATIONS_PER_EPOCH_KEY = numAttestationsPerEpochKey
        const MAX_NONCE = 2
        const ATTESTATIONS_PER_EPOCH_KEY = 6
        const TOTAL_NUM_ATTESTATIONS = MAX_NONCE * ATTESTATIONS_PER_EPOCH_KEY
        const maxNumAttesters = 2 ** circuitUserStateTreeDepth
        const expectedNumAttestationsMade = Math.floor(maxNumAttesters / 2)

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree, GSTreeRoot, GSTreeProof, newGSTLeaf
        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements: any[]
        let nullifierTree: SparseMerkleTreeImpl, nullifierTreeRoot, nullifierTreePathElements
        let userStateTree: SparseMerkleTreeImpl
        let intermediateUserStateTreeRoots, userStateTreePathElements
        let oldPosReps, oldNegReps, oldGraffities

        let reputationRecords = {}
        let attesterIds: BigInt[], posReps: BigInt[], negReps: BigInt[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
        let selectors: number[] = []
        let nullifiers: BigInt[]
        let hashChainResults: BigInt[] = []

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
            oldPosReps = []
            oldNegReps = []
            oldGraffities = []

            // Bootstrap user state
            for (let i = 1; i < maxNumAttesters; i++) {
                const  attesterId = BigInt(i)
                if (reputationRecords[attesterId.toString()] === undefined) {
                    reputationRecords[attesterId.toString()] = new Reputation(
                        BigInt(Math.floor(Math.random() * 100)),
                        BigInt(Math.floor(Math.random() * 100)),
                        genRandomSalt(),
                    )
                }
                await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId.toString()].hash())
            }
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())

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

            let numAttestationsMade = 0
            for (let i = 0; i < TOTAL_NUM_ATTESTATIONS; i++) {
                if (numAttestationsMade < expectedNumAttestationsMade) {
                    const s = Math.floor(Math.random() * 2)
                    selectors.push(s)
                    if (s == 1) numAttestationsMade++
                } else {
                    selectors.push(0)
                }
            }

            // Begin generating and processing attestations
            nullifiers = []
            epochTreePathElements = []
            let hashChainResult: BigInt
            const attesterToNonceMap = {}
            let startIndex
            for (let nonce = 0; nonce < MAX_NONCE; nonce++) {
                startIndex = nonce * ATTESTATIONS_PER_EPOCH_KEY
                attesterToNonceMap[nonce] = []
                hashChainResult = BigInt(0)
                // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
                // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
                const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                for (let i = 0; i < ATTESTATIONS_PER_EPOCH_KEY; i++) {
                    // attesterId ranges from 1 to (maxNumAttesters - 1)
                    let attesterId = BigInt(1 + Math.floor(Math.random() * (maxNumAttesters - 1)))
                    while (attesterToNonceMap[nonce].indexOf(attesterId) >= 0) attesterId = BigInt(Math.floor(Math.random() * maxNumAttesters))
                    const attestation: Attestation = new Attestation(
                        attesterId,
                        BigInt(Math.floor(Math.random() * 100)),
                        BigInt(Math.floor(Math.random() * 100)),
                        genRandomSalt(),
                        true,
                    )
                    // If nullifier tree is too small, it's likely that nullifier would be zero and
                    // this conflicts with the reserved zero leaf of nullifier tree.
                    // In this case, force selector to be zero.
                    const nullifier = genAttestationNullifier(user['identityNullifier'], attesterId, epoch, epochKey, circuitNullifierTreeDepth)
                    if ( nullifier == BigInt(0) ) {
                        if (selectors[startIndex + i] == 1) numAttestationsMade--
                        selectors[startIndex + i] = 0
                    }

                    if ( selectors[startIndex + i] == 1) {
                        attesterToNonceMap[nonce].push(attesterId)

                        attesterIds.push(attesterId)
                        posReps.push(attestation['posRep'])
                        negReps.push(attestation['negRep'])
                        graffities.push(attestation['graffiti'])
                        overwriteGraffitis.push(attestation['overwriteGraffiti'])

                        oldPosReps.push(reputationRecords[attesterId.toString()]['posRep'])
                        oldNegReps.push(reputationRecords[attesterId.toString()]['negRep'])
                        oldGraffities.push(reputationRecords[attesterId.toString()]['graffiti'])

                        // Get old attestation record proof
                        const oldReputationRecordProof = await userStateTree.getMerkleProof(BigInt(attesterId))
                        userStateTreePathElements.push(oldReputationRecordProof)

                        // Update attestation record
                        reputationRecords[attesterId.toString()]['posRep'] += attestation['posRep']
                        reputationRecords[attesterId.toString()]['negRep'] += attestation['negRep']
                        if (attestation['overwriteGraffiti']) reputationRecords[attesterId.toString()]['graffiti'] = attestation['graffiti']
                        await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId.toString()].hash())

                        const attestation_hash = attestation.hash()
                        hashChainResult = hashLeftRight(attestation_hash, hashChainResult)

                        nullifiers.push(nullifier)
                        const nullifierTreeProof = await nullifierTree.getMerkleProof(nullifier)
                        nullifierTreePathElements.push(nullifierTreeProof)
                    } else {
                        attesterIds.push(BigInt(0))
                        posReps.push(BigInt(0))
                        negReps.push(BigInt(0))
                        graffities.push(BigInt(0))
                        overwriteGraffitis.push(false)

                        oldPosReps.push(BigInt(0))
                        oldNegReps.push(BigInt(0))
                        oldGraffities.push(BigInt(0))

                        const USTLeafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                        userStateTreePathElements.push(USTLeafZeroPathElements)

                        nullifiers.push(BigInt(0))
                        const nullifierTreeProof = await nullifierTree.getMerkleProof(BigInt(0))
                        nullifierTreePathElements.push(nullifierTreeProof)
                    }
                    intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
                }
                // Seal hash chain of this epoch key
                hashChainResult = hashLeftRight(BigInt(1), hashChainResult)
                hashChainResults.push(hashChainResult)
                // Update epoch tree
                await epochTree.update(epochKey, hashChainResult)
            }

            // Compute new GST Leaf
            const latestUSTRoot = intermediateUserStateTreeRoots[TOTAL_NUM_ATTESTATIONS]
            newGSTLeaf = hashLeftRight(commitment, latestUSTRoot)

            for (let nonce = 0; nonce < MAX_NONCE; nonce++) {
                const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                // Get epoch tree root and merkle proof for this epoch key
                epochTreePathElements.push(await epochTree.getMerkleProof(epochKey))
            }
            epochTreeRoot = epochTree.getRootHash()
        })

        describe('Process epoch keys', () => {
            // it.only('compile', async () => {
            //     expect(true).to.be.true
            // })
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = {
                    epoch: epoch,
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
                    hash_chain_results: hashChainResults,
                    epoch_tree_root: epochTreeRoot,
                    nullifier_tree_root: nullifierTreeRoot,
                    attestation_nullifier_path_elements: nullifierTreePathElements
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                for (let i = 0; i < TOTAL_NUM_ATTESTATIONS; i++) {
                    const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
                    expect(nullifier).to.equal(nullifiers[i])
                }
                const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
                expect(BigNumber.from(_newGSTLeaf)).to.equal(BigNumber.from(newGSTLeaf))

                const startTime = Math.floor(new Date().getTime() / 1000)
                const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), circuit)
                const endTime = Math.floor(new Date().getTime() / 1000)
                console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
                const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
                expect(isValid).to.be.true
            })

            it('User state update with invalid selector value should not work', async () => {
                const invalidSelectors = selectors.slice()
                const indexToCorrupt = Math.floor(Math.random() * (TOTAL_NUM_ATTESTATIONS))
                invalidSelectors[indexToCorrupt] = 99  // selector value should be binary
                const circuitInputs = {
                    epoch: epoch,
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
                    selectors: invalidSelectors,
                    attester_ids: attesterIds,
                    pos_reps: posReps,
                    neg_reps: negReps,
                    graffities: graffities,
                    overwrite_graffitis: overwriteGraffitis,
                    epk_path_elements: epochTreePathElements,
                    hash_chain_results: hashChainResults,
                    epoch_tree_root: epochTreeRoot,
                    nullifier_tree_root: nullifierTreeRoot,
                    attestation_nullifier_path_elements: nullifierTreePathElements
                }

                let error
                try {
                    await executeCircuit(circuit, circuitInputs)
                } catch (e) {
                    error = e
                    console.log(`Expected error: ${error}`)
                    expect(true).to.be.true
                } finally {
                    if (!error) throw Error("Invalid selector value should throw error")
                }
            })
        })
    })
})