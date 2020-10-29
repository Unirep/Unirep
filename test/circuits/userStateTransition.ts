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
import { circuitEpochTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, globalStateTreeDepth, maxAttestationsPerEpochKey, maxEpochKeyNonce } from "../../config/testLocal"
import { genEpochKey, genAttestationNullifier, genNewEpochTree, genNewNullifierTree, genNewUserStateTree, genEpochKeyNullifier, SMT_ONE_LEAF } from "../utils"
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { Attestation, Reputation } from "../../core"

describe('User State Transition circuits', function () {
    this.timeout(400000)

    const epoch = 1
    const user = genIdentity()

    describe('Epoch key exists', () => {

        let circuit

        const nonce = maxEpochKeyNonce
        const epochKey: SnarkBigInt = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)

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

    describe('Check epoch keys processed', () => {
        const maxEpochKeyNonce = 5
        let circuit

        const nonce = Math.floor(Math.random() * (maxEpochKeyNonce + 1))
        let nullifierTree: SparseMerkleTreeImpl, nullifierTreeRoot
        let epkPathElements: any[]
        let isEPKProcessed: number[]

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/allEpochKeyProcessed_test.circom')
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)
        })

        it('all epoch keys processed should return true', async () => {
            epkPathElements = []
            isEPKProcessed = []
            nullifierTree = await genNewNullifierTree("circuit")
            
            for (let n = 0; n <= maxEpochKeyNonce; n++) {
                if (n == nonce) {
                    // Do not update epoch key that is to be processed
                    isEPKProcessed.push(0)
                    continue
                }
                isEPKProcessed.push(1)
                const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, n, circuitNullifierTreeDepth)
                await nullifierTree.update(epkNullifier, SMT_ONE_LEAF)
            }

            for (let n = 0; n <= maxEpochKeyNonce; n++) {
                const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, n, circuitNullifierTreeDepth)
                epkPathElements.push(await nullifierTree.getMerkleProof(epkNullifier))
            }
            nullifierTreeRoot = nullifierTree.getRootHash()

            const circuitInputs = {
                epoch: epoch,
                nonce: nonce,
                identity_nullifier: user['identityNullifier'],
                nullifier_tree_root: nullifierTreeRoot,
                epk_nullifier_path_elements: epkPathElements,
                is_epk_processed: isEPKProcessed
            }

            const witness = await executeCircuit(circuit, circuitInputs)
            const isAllEpochKeyProcessed = getSignalByName(circuit, witness, 'main.is_all_epoch_key_processed')
            expect(BigNumber.from(isAllEpochKeyProcessed)).to.equal(1)
        })

        it('not all epoch keys processed should return false', async () => {
            epkPathElements = []
            isEPKProcessed = []
            nullifierTree = await genNewNullifierTree("circuit")

            // Pick another nonce to be to unprocessed epoch key so
            // it does not satisfy the all-epoch-key-processed condition.
            let anotherZero = Math.floor(Math.random() * (maxEpochKeyNonce + 1))
            while (anotherZero == nonce) anotherZero = Math.floor(Math.random() * (maxEpochKeyNonce + 1))

            for (let n = 0; n <= maxEpochKeyNonce; n++) {
                let shouldBeProcessed
                if (n == nonce || n == anotherZero) shouldBeProcessed = 0
                else shouldBeProcessed = Math.floor(Math.random() * 2)
                isEPKProcessed.push(shouldBeProcessed)

                const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, n, circuitNullifierTreeDepth)
                if (shouldBeProcessed == 1) await nullifierTree.update(epkNullifier, SMT_ONE_LEAF)
            }

            for (let n = 0; n <= maxEpochKeyNonce; n++) {
                const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, n, circuitNullifierTreeDepth)
                epkPathElements.push(await nullifierTree.getMerkleProof(epkNullifier))
            }
            nullifierTreeRoot = nullifierTree.getRootHash()

            const circuitInputs = {
                epoch: epoch,
                nonce: nonce,
                identity_nullifier: user['identityNullifier'],
                nullifier_tree_root: nullifierTreeRoot,
                epk_nullifier_path_elements: epkPathElements,
                is_epk_processed: isEPKProcessed
            }

            const witness = await executeCircuit(circuit, circuitInputs)
            const isAllEpochKeyProcessed = getSignalByName(circuit, witness, 'main.is_all_epoch_key_processed')
            expect(BigNumber.from(isAllEpochKeyProcessed)).to.equal(0)
        })

        it('wrong isEPKProcessed selectors should not work', async () => {
            epkPathElements = []
            nullifierTree = await genNewNullifierTree("circuit")
            
            const wrongIsEPKProcessed: number[] = []
            for (let n = 0; n <= maxEpochKeyNonce; n++) {
                // Set all selectors to 1. This should not happen as the
                // epoch key that is being processed should not be counted as
                // one of the processed epoch keys.
                wrongIsEPKProcessed.push(1)
                const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, n, circuitNullifierTreeDepth)
                epkPathElements.push(await nullifierTree.getMerkleProof(epkNullifier))
            }
            nullifierTreeRoot = nullifierTree.getRootHash()

            const circuitInputs = {
                epoch: epoch,
                nonce: nonce,
                identity_nullifier: user['identityNullifier'],
                nullifier_tree_root: nullifierTreeRoot,
                epk_nullifier_path_elements: epkPathElements,
                is_epk_processed: wrongIsEPKProcessed
            }

            let error
            try {
                await executeCircuit(circuit, circuitInputs)
            } catch (e) {
                error = e
                expect(true).to.be.true
            } finally {
                if (!error) throw Error("Invalid nonce should throw error")
            }
        })
    })

    describe('User State Transition', () => {

        let circuit

        const MAX_NONCE = maxEpochKeyNonce
        const NUM_ATTESTATIONS = maxAttestationsPerEpochKey

        let nonce, epochKey

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree, GSTreeRoot, GSTreeProof, newGSTLeaf
        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements
        let nullifierTree: SparseMerkleTreeImpl, nullifierTreeRoot, nullifierTreePathElements
        let epkNullifierPathElements, isEPKProcessedSelectors
        let userStateTree: SparseMerkleTreeImpl
        let intermediateUserStateTreeRoots, userStateTreePathElements, noAttestationUserStateTreePathElements
        let oldPosReps, oldNegReps, oldGraffities

        let reputationRecords = {}
        let attesterIds: BigInt[], posReps: BigInt[], negReps: BigInt[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
        let selectors: number[] = []
        let nullifiers: SnarkBigInt[]
        let hashChainResult: SnarkBigInt

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

            // Process first epoch key
            nonce = 0
            epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)

            // Epoch tree
            epochTree = await genNewEpochTree("circuit")

            // Nullifier tree
            nullifierTreePathElements = []
            nullifierTree = await genNewNullifierTree("circuit")
            nullifierTreeRoot = nullifierTree.getRootHash()
            // Epoch key nullifiers
            epkNullifierPathElements = []
            isEPKProcessedSelectors = []

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
                const  attesterId = BigInt(i + 1)
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
                const attesterId = BigInt(i + 1)
                const attestation: Attestation = new Attestation(
                    attesterId,
                    BigInt(Math.floor(Math.random() * 100)),
                    BigInt(Math.floor(Math.random() * 100)),
                    genRandomSalt(),
                    true,
                )
                attesterIds.push(attesterId)
                posReps.push(attestation['posRep'])
                negReps.push(attestation['negRep'])
                graffities.push(attestation['graffiti'])
                overwriteGraffitis.push(attestation['overwriteGraffiti'])

                oldPosReps.push(reputationRecords[attesterId.toString()]['posRep'])
                oldNegReps.push(reputationRecords[attesterId.toString()]['negRep'])
                oldGraffities.push(reputationRecords[attesterId.toString()]['graffiti'])

                // If nullifier tree is too small, it's likely that nullifier would be zero.
                // In this case, force selector to be zero.
                const nullifier = genAttestationNullifier(user['identityNullifier'], BigInt(attesterId), epoch, circuitNullifierTreeDepth)
                if ( nullifier == BigInt(0) ) {
                    selectors[i] = 0
                    // If unfortunately this is the selector forced to be true,
                    // then we force next selector to be true instead.
                    if (i == selTrue) selectors[i + 1] = 1
                }

                if ( selectors[i] == 1) {
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

            // Update epoch tree
            await epochTree.update(epochKey, hashChainResult)
            // Get epoch tree root and merkle proof for this epoch key
            epochTreePathElements = await epochTree.getMerkleProof(epochKey)
            epochTreeRoot = epochTree.getRootHash()

            // Compute merkle proof of nullifier of every epoch key in nullifier tree
            for (let n = 0; n <= MAX_NONCE; n++) {
                if (n == nonce) isEPKProcessedSelectors.push(0)  // Epoch key to be processed should not be counted as processed
                else isEPKProcessedSelectors.push(0)  // No epoch keys have been processed yet so all selectors should be 0
                const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, n, circuitNullifierTreeDepth)
                console.log(`Nullifier of epoch key with nonce ${n}: ${epkNullifier}`)
                const epkNullifierProof = await nullifierTree.getMerkleProof(epkNullifier)
                epkNullifierPathElements.push(epkNullifierProof)
            }
        })

        describe('Process first epoch key', () => {
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = {
                    epoch: epoch,
                    nonce: nonce,
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
                    nullifier_tree_path_elements: nullifierTreePathElements,
                    epk_nullifier_path_elements: epkNullifierPathElements,
                    is_epk_processed_selectors: isEPKProcessedSelectors
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                    const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
                    expect(nullifier).to.equal(nullifiers[i])
                }
                const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
                expect(BigNumber.from(_newGSTLeaf)).to.equal(0)

                const startTime = Math.floor(new Date().getTime() / 1000)
                const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), circuit)
                const endTime = Math.floor(new Date().getTime() / 1000)
                console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
                const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
                expect(isValid).to.be.true
            })

            it('User state update with invalid nonce should not work', async () => {
                const invalidNonce = MAX_NONCE + 1
                const circuitInputs = {
                    epoch: epoch,
                    nonce: invalidNonce,
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

                let error
                try {
                    await executeCircuit(circuit, circuitInputs)
                } catch (e) {
                    error = e
                    expect(true).to.be.true
                } finally {
                    if (!error) throw Error("Invalid nonce should throw error")
                }
            })
        })

        describe('Process second epoch key which receives no attestations', () => {
            before(async () => {
                const prevNonce = 0
                // Update attestation nullifiers after processing first epoch key
                console.log("Previous attestation nullifiers", nullifiers)
                for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                    await nullifierTree.update(nullifiers[i], SMT_ONE_LEAF)
                }
                // Update epoch key nullifier of first epoch key
                const firstEpochKeyNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, prevNonce, circuitNullifierTreeDepth)
                await nullifierTree.update(firstEpochKeyNullifier, SMT_ONE_LEAF)

                // Process second epoch key
                nonce = 1
                epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
    
                // Nullifier tree
                nullifierTreePathElements = []
                nullifierTreeRoot = nullifierTree.getRootHash()
                // Epoch key nullifiers
                epkNullifierPathElements = []
                isEPKProcessedSelectors = []
    
                // User state tree
                intermediateUserStateTreeRoots = []
                userStateTreePathElements = []
                noAttestationUserStateTreePathElements = []
                oldPosReps = []
                oldNegReps = []
                oldGraffities = []
    
                intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
                const USTLeafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                for (let i = 0; i < NUM_ATTESTATIONS; i++) noAttestationUserStateTreePathElements.push(USTLeafZeroPathElements)
    
                // Global state tree
                const commitment = genIdentityCommitment(user)
                // NOTE: GST should be updated only before processing any epoch keys.
                // Here for ease of testing we update the GST separately.
                const hashedStateLeaf = hashLeftRight(commitment, userStateTree.getRootHash())
                GSTree.update(0, hashedStateLeaf)
                GSTreeProof = GSTree.genMerklePath(0)
                GSTreeRoot = GSTree.root
    
                selectors = []
                attesterIds = []
                posReps = []
                negReps = []
                graffities = []
                overwriteGraffitis = []
    
                nullifiers = []
                hashChainResult = BigInt(0)
                // No attestations made to this epoch key
                for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                    selectors.push(0)
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
                    intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
                }
                // Seal hash chain of this epoch key
                hashChainResult = hashLeftRight(BigInt(1), hashChainResult)
    
                // Compute new GST Leaf
                const latestUSTRoot = intermediateUserStateTreeRoots[NUM_ATTESTATIONS]
                newGSTLeaf = hashLeftRight(commitment, latestUSTRoot)
    
                // Update epoch tree
                // NOTE: epoch tree should be updated only once, before processing any epoch keys.
                // Here for ease of testing we update the epoch tree separately.
                await epochTree.update(epochKey, hashChainResult)
                // Get epoch tree root and merkle proof for this epoch key
                epochTreePathElements = await epochTree.getMerkleProof(epochKey)
                epochTreeRoot = epochTree.getRootHash()
    
                // Compute merkle proof of nullifier of every epoch key in nullifier tree
                for (let n = 0; n <= MAX_NONCE; n++) {
                    if (n == nonce) isEPKProcessedSelectors.push(0)  // Epoch key to be processed should not be counted as processed
                    else if (n == prevNonce) isEPKProcessedSelectors.push(1)
                    else isEPKProcessedSelectors.push(0)
                    const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, n, circuitNullifierTreeDepth)
                    const epkNullifierProof = await nullifierTree.getMerkleProof(epkNullifier)
                    epkNullifierPathElements.push(epkNullifierProof)
                }
            })

            it('Valid user state update inputs should work', async () => {
                const circuitInputs = {
                    epoch: epoch,
                    nonce: nonce,
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
                    nullifier_tree_path_elements: nullifierTreePathElements,
                    epk_nullifier_path_elements: epkNullifierPathElements,
                    is_epk_processed_selectors: isEPKProcessedSelectors
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                for (let i = 0; i < NUM_ATTESTATIONS; i++) {
                    const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
                    expect(nullifier).to.equal(nullifiers[i])
                }
                const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
                expect(BigNumber.from(_newGSTLeaf)).to.equal(newGSTLeaf)

                const startTime = Math.floor(new Date().getTime() / 1000)
                const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), circuit)
                const endTime = Math.floor(new Date().getTime() / 1000)
                console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
                const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
                expect(isValid).to.be.true
            })
        })
    })
})