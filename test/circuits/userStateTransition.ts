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
    getSignalByName,
    genProofAndPublicSignals,
    verifyProof
} from '../../circuits/utils'
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch } from "../../config/testLocal"
import { genNewEpochTree, genNewUserStateTree } from "../utils"
import { genEpochKey } from "../../core/utils"
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { Reputation } from "../../core"

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
        const expectedNumAttestationsMade = 5

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree, GSTreeRoot, GSTreeProof, newGSTLeaf
        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements: any[]
        let userStateTree: SparseMerkleTreeImpl
        let intermediateUserStateTreeRoots
        let blindedUserState: BigInt[]
        let blindedHashChain: BigInt[]

        let reputationRecords = {}
        let hashChainResults: BigInt[] = []
        let hashedLeaf

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

            // Bootstrap user state for the first `expectedNumAttestationsMade` attesters
            for (let i = 1; i < expectedNumAttestationsMade; i++) {
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
            hashedLeaf = hashLeftRight(commitment, userStateTree.getRootHash())
            GSTree.insert(hashedLeaf)
            GSTreeProof = GSTree.genMerklePath(0)
            GSTreeRoot = GSTree.root

            blindedUserState = []
            blindedHashChain = []

            // Begin generating and processing attestations
            epochTreePathElements = []
            for (let nonce = 0; nonce < EPK_NONCE_PER_EPOCH; nonce++) {
                // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
                // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
                const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                const intermediateUserStateTreeRoot = genRandomSalt()
                const hashChainResult = genRandomSalt()

                // Blinded user state result
                intermediateUserStateTreeRoots.push(intermediateUserStateTreeRoot)
                blindedUserState.push(hash5([user['identityNullifier'], intermediateUserStateTreeRoot, nonce]))

                // Blinded hash chain result
                hashChainResults.push(hashChainResult)
                blindedHashChain.push(hash5([user['identityNullifier'], hashChainResult, nonce]))

                // Seal hash chain of this epoch key
                const sealedHashChainResult = hashLeftRight(BigInt(1), hashChainResult)

                // Update epoch tree
                await epochTree.update(epochKey, sealedHashChainResult)
            }

            // Compute new GST Leaf
            const latestUSTRoot = intermediateUserStateTreeRoots[EPK_NONCE_PER_EPOCH]
            newGSTLeaf = hashLeftRight(commitment, latestUSTRoot)

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
                    blinded_user_state: blindedUserState,
                    intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot,
                    epk_path_elements: epochTreePathElements,
                    hash_chain_results: hashChainResults,
                    blinded_hash_chain_results: blindedHashChain,
                    epoch_tree_root: epochTreeRoot
                }
                const witness = await executeCircuit(circuit, circuitInputs)
                const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
                expect(BigNumber.from(_newGSTLeaf)).to.equal(BigNumber.from(newGSTLeaf))

                const startTime = new Date().getTime()
                const results = await genProofAndPublicSignals('userStateTransition', stringifyBigInts(circuitInputs))
                const endTime = new Date().getTime()
                console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
                const isValid = await verifyProof('userStateTransition', results['proof'], results['publicSignals'])
                expect(isValid).to.be.true
            })
        })
    })
})