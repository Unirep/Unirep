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
    hash5,
} from 'maci-crypto'

import {
    compileAndLoadCircuit,
    executeCircuit,
    genVerifyUserStateTransitionProofAndPublicSignals,
    verifyUserStateTransitionProof,
    getSignalByName,
} from './utils'
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch } from "../../config/testLocal"
import { genEpochKey, genAttestationNullifier, genNewEpochTree, genNewUserStateTree } from "../utils"
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { Attestation, Reputation } from "../../core"
import { DEFAULT_AIRDROPPED_KARMA } from "../../config/socialMedia"

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

        const EPK_NONCE_PER_EPOCH = numEpochKeyNoncePerEpoch
        const ATTESTATIONS_PER_EPOCH_KEY = numAttestationsPerEpochKey
        const TOTAL_NUM_ATTESTATIONS = EPK_NONCE_PER_EPOCH * ATTESTATIONS_PER_EPOCH_KEY
        const maxNumAttesters = 2 ** circuitUserStateTreeDepth
        const expectedNumAttestationsMade = Math.floor(maxNumAttesters / 2)

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree, GSTreeRoot, GSTreeProof, newGSTLeaf
        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements: any[]
        let userStateTree: SparseMerkleTreeImpl
        let intermediateUserStateTreeRoots, userStateLeafPathElements
        let oldPosReps, oldNegReps, oldGraffities

        let reputationRecords = {}
        let attesterIds: BigInt[], posReps: BigInt[], negReps: BigInt[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
        let selectors: number[] = []
        let nullifiers: BigInt[]
        let hashChainResults: BigInt[] = []
        let hashedLeaf
        const transitionedPosRep = 20
        const transitionedNegRep = 0
        let currentEpochPosRep = 0
        let currentEpochNegRep = 0

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

            // Epoch tree
            epochTree = await genNewEpochTree("circuit")

            // User state tree
            userStateTree = await genNewUserStateTree("circuit")
            intermediateUserStateTreeRoots = []
            userStateLeafPathElements = []
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
            GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
            const commitment = genIdentityCommitment(user)
            hashedLeaf = hash5([
                commitment, 
                userStateTree.getRootHash(),
                BigInt(transitionedPosRep),
                BigInt(transitionedNegRep),
                BigInt(0)
            ])
            GSTree.insert(hashedLeaf)
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
            for (let nonce = 0; nonce < EPK_NONCE_PER_EPOCH; nonce++) {
                startIndex = nonce * ATTESTATIONS_PER_EPOCH_KEY
                attesterToNonceMap[nonce] = []
                hashChainResult = BigInt(0)
                // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
                // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
                const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                for (let i = 0; i < ATTESTATIONS_PER_EPOCH_KEY; i++) {
                    // attesterId ranges from 1 to (maxNumAttesters - 1)
                    let attesterId = BigInt(1 + Math.floor(Math.random() * (maxNumAttesters - 1)))
                    // re-sample attesterId if it is already in the list
                    while (attesterToNonceMap[nonce].indexOf(attesterId) >= 0) {
                        attesterId = BigInt(1 + Math.floor(Math.random() * (maxNumAttesters - 1)))
                    }
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
                        userStateLeafPathElements.push(oldReputationRecordProof)

                        // Update attestation record
                        reputationRecords[attesterId.toString()].update(
                            attestation['posRep'],
                            attestation['negRep'],
                            attestation['graffiti'],
                            attestation['overwriteGraffiti']
                        )
                        currentEpochPosRep += Number(attestation['posRep'])
                        currentEpochNegRep += Number(attestation['negRep'])
                        await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId.toString()].hash())

                        const attestation_hash = attestation.hash()
                        hashChainResult = hashLeftRight(attestation_hash, hashChainResult)

                        nullifiers.push(nullifier)
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
                        userStateLeafPathElements.push(USTLeafZeroPathElements)

                        nullifiers.push(BigInt(0))
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
            newGSTLeaf = hash5([
                commitment,
                latestUSTRoot,
                BigInt(transitionedPosRep + currentEpochPosRep + DEFAULT_AIRDROPPED_KARMA),
                BigInt(transitionedNegRep + currentEpochNegRep),
                BigInt(0)
            ])

            for (let nonce = 0; nonce < EPK_NONCE_PER_EPOCH; nonce++) {
                const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                // Get epoch tree root and merkle proof for this epoch key
                epochTreePathElements.push(await epochTree.getMerkleProof(epochKey))
            }
            epochTreeRoot = epochTree.getRootHash()
        })

        describe('Process epoch keys', () => {
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = {
                    epoch: epoch,
                    intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
                    old_pos_reps: oldPosReps,
                    old_neg_reps: oldNegReps,
                    old_graffities: oldGraffities,
                    UST_path_elements: userStateLeafPathElements,
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    user_state_hash: hashedLeaf,
                    old_positive_karma: BigInt(transitionedPosRep),
                    old_negative_karma: BigInt(transitionedNegRep),
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot,
                    selectors: selectors,
                    attester_ids: attesterIds,
                    pos_reps: posReps,
                    neg_reps: negReps,
                    graffities: graffities,
                    overwrite_graffitis: overwriteGraffitis,
                    positive_karma: BigInt(transitionedPosRep + currentEpochPosRep + DEFAULT_AIRDROPPED_KARMA),
                    negative_karma: BigInt(transitionedNegRep + currentEpochNegRep),
                    airdropped_karma: DEFAULT_AIRDROPPED_KARMA,
                    epk_path_elements: epochTreePathElements,
                    hash_chain_results: hashChainResults,
                    epoch_tree_root: epochTreeRoot
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                for (let i = 0; i < TOTAL_NUM_ATTESTATIONS; i++) {
                    const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
                    const modedNullifier = BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth)
                    expect(modedNullifier).to.equal(nullifiers[i])
                }
                const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
                expect(BigNumber.from(_newGSTLeaf)).to.equal(BigNumber.from(newGSTLeaf))

                const startTime = new Date().getTime()
                const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
                const endTime = new Date().getTime()
                console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
                const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
                expect(isValid).to.be.true
            })

            it('Same attester give reputation to different epoch keys should work', async () => {

                // Epoch tree
                epochTree = await genNewEpochTree("circuit")

                // User state tree
                userStateTree = await genNewUserStateTree("circuit")
                intermediateUserStateTreeRoots = []
                userStateLeafPathElements = []
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
                GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
                const commitment = genIdentityCommitment(user)
                hashedLeaf = hash5([
                    commitment, 
                    userStateTree.getRootHash(),
                    BigInt(transitionedPosRep),
                    BigInt(transitionedNegRep),
                    BigInt(0)
                ])
                GSTree.insert(hashedLeaf)
                GSTreeProof = GSTree.genMerklePath(0)
                GSTreeRoot = GSTree.root

                attesterIds = []
                posReps = []
                negReps = []
                graffities = []
                overwriteGraffitis = []
                selectors = []
                hashChainResults = []
                currentEpochPosRep = 0
                currentEpochNegRep = 0

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
                // generate an attester id list
                const attesterIdList: BigInt[] = []
                for(let i = 1; i <= ATTESTATIONS_PER_EPOCH_KEY; i++) {
                    attesterIdList.push(BigInt(i))
                }
                
                for (let nonce = 0; nonce < EPK_NONCE_PER_EPOCH; nonce++) {
                    startIndex = nonce * ATTESTATIONS_PER_EPOCH_KEY
                    attesterToNonceMap[nonce] = []
                    hashChainResult = BigInt(0)
                    // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
                    // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
                    const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                    for (let i = 0; i < ATTESTATIONS_PER_EPOCH_KEY; i++) {
                        // attesterId ranges from 1 to (maxNumAttesters - 1)
                        let attesterId = attesterIdList[i]
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
                            userStateLeafPathElements.push(oldReputationRecordProof)

                            // Update attestation record
                            reputationRecords[attesterId.toString()].update(
                                attestation['posRep'],
                                attestation['negRep'],
                                attestation['graffiti'],
                                attestation['overwriteGraffiti']
                            )
                            currentEpochPosRep += Number(attestation['posRep'])
                            currentEpochNegRep += Number(attestation['negRep'])
                            await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId.toString()].hash())

                            const attestation_hash = attestation.hash()
                            hashChainResult = hashLeftRight(attestation_hash, hashChainResult)

                            nullifiers.push(nullifier)
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
                            userStateLeafPathElements.push(USTLeafZeroPathElements)

                            nullifiers.push(BigInt(0))
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
                newGSTLeaf = hash5([
                    commitment,
                    latestUSTRoot,
                    BigInt(transitionedPosRep + currentEpochPosRep + DEFAULT_AIRDROPPED_KARMA),
                    BigInt(transitionedNegRep + currentEpochNegRep),
                    BigInt(0)
                ])

                for (let nonce = 0; nonce < EPK_NONCE_PER_EPOCH; nonce++) {
                    const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                    // Get epoch tree root and merkle proof for this epoch key
                    epochTreePathElements.push(await epochTree.getMerkleProof(epochKey))
                }
                epochTreeRoot = epochTree.getRootHash()

                const circuitInputs = {
                    epoch: epoch,
                    intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
                    old_pos_reps: oldPosReps,
                    old_neg_reps: oldNegReps,
                    old_graffities: oldGraffities,
                    UST_path_elements: userStateLeafPathElements,
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    user_state_hash: hashedLeaf,
                    old_positive_karma: BigInt(transitionedPosRep),
                    old_negative_karma: BigInt(transitionedNegRep),
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot,
                    selectors: selectors,
                    attester_ids: attesterIds,
                    pos_reps: posReps,
                    neg_reps: negReps,
                    graffities: graffities,
                    overwrite_graffitis: overwriteGraffitis,
                    positive_karma: BigInt(transitionedPosRep + currentEpochPosRep + DEFAULT_AIRDROPPED_KARMA),
                    negative_karma: BigInt(transitionedNegRep + currentEpochNegRep),
                    airdropped_karma: DEFAULT_AIRDROPPED_KARMA,
                    epk_path_elements: epochTreePathElements,
                    hash_chain_results: hashChainResults,
                    epoch_tree_root: epochTreeRoot
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                for (let i = 0; i < TOTAL_NUM_ATTESTATIONS; i++) {
                    const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
                    const modedNullifier = BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth)
                    expect(modedNullifier).to.equal(nullifiers[i])
                }
                const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
                expect(BigNumber.from(_newGSTLeaf)).to.equal(BigNumber.from(newGSTLeaf))

                const startTime = new Date().getTime()
                const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
                const endTime = new Date().getTime()
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
                    UST_path_elements: userStateLeafPathElements,
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    user_state_hash: hashedLeaf,
                    old_positive_karma: BigInt(transitionedPosRep),
                    old_negative_karma: BigInt(transitionedNegRep),
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot,
                    selectors: invalidSelectors,
                    attester_ids: attesterIds,
                    pos_reps: posReps,
                    neg_reps: negReps,
                    graffities: graffities,
                    overwrite_graffitis: overwriteGraffitis,
                    positive_karma: BigInt(transitionedPosRep + currentEpochPosRep + DEFAULT_AIRDROPPED_KARMA),
                    negative_karma: BigInt(transitionedNegRep + currentEpochNegRep),
                    airdropped_karma: DEFAULT_AIRDROPPED_KARMA,
                    epk_path_elements: epochTreePathElements,
                    hash_chain_results: hashChainResults,
                    epoch_tree_root: epochTreeRoot
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