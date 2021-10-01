import { expect } from 'chai'
import { IncrementalQuinTree, genRandomSalt, hashLeftRight, stringifyBigInts, hash5, genIdentity, genIdentityCommitment } from '@unirep/crypto'
import { genProofAndPublicSignals,verifyProof } from '@unirep/circuits'

import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch } from "../../config/testLocal"
import { genNewEpochTree, genNewUserStateTree } from "../utils"
import { genEpochKey } from "../../core/utils"
import { Reputation } from "../../core"

describe('User State Transition circuits', function () {
    this.timeout(600000)

    const epoch = 1
    const user = genIdentity()
    const signUp = 1
    const startEpochKeyNonce = 0
    const endEpochKeyNonce = numEpochKeyNoncePerEpoch - 1

    describe('User State Transition', () => {

        const EPK_NONCE_PER_EPOCH = numEpochKeyNoncePerEpoch
        const expectedNumAttestationsMade = 5

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree, GSTreeRoot, GSTreeProof, newGSTLeaf
        let epochTree, epochTreeRoot, epochTreePathElements: any[]
        let userStateTree
        let intermediateUserStateTreeRoots
        let blindedUserState: BigInt[]
        let blindedHashChain: BigInt[]

        let reputationRecords = {}
        let hashChainResults: BigInt[] = []
        let hashedLeaf

        before(async () => {
            // Epoch tree
            epochTree = await genNewEpochTree("circuit")

            // User state tree
            userStateTree = await genNewUserStateTree("circuit")
            intermediateUserStateTreeRoots = []
            blindedUserState = []
            blindedHashChain = []
            epochTreePathElements = []

            // Bootstrap user state for the first `expectedNumAttestationsMade` attesters
            for (let i = 1; i < expectedNumAttestationsMade; i++) {
                const  attesterId = BigInt(i)
                if (reputationRecords[attesterId.toString()] === undefined) {
                    reputationRecords[attesterId.toString()] = new Reputation(
                        BigInt(Math.floor(Math.random() * 100)),
                        BigInt(Math.floor(Math.random() * 100)),
                        genRandomSalt(),
                        BigInt(signUp),
                    )
                }
                await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId.toString()].hash())
            }
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
            blindedUserState.push(hash5([user['identityNullifier'], userStateTree.getRootHash(), BigInt(epoch), BigInt(startEpochKeyNonce)]))

            // Global state tree
            GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
            const commitment = genIdentityCommitment(user)
            hashedLeaf = hashLeftRight(commitment, userStateTree.getRootHash())
            GSTree.insert(hashedLeaf)
            GSTreeProof = GSTree.genMerklePath(0)
            GSTreeRoot = GSTree.root

            // Begin generating and processing attestations
            for (let nonce = 0; nonce < EPK_NONCE_PER_EPOCH; nonce++) {
                // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
                // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
                const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
                const hashChainResult = genRandomSalt()

                // Blinded hash chain result
                hashChainResults.push(hashChainResult)
                blindedHashChain.push(hash5([user['identityNullifier'], hashChainResult, BigInt(epoch), BigInt(nonce)]))

                // Seal hash chain of this epoch key
                const sealedHashChainResult = hashLeftRight(BigInt(1), hashChainResult)

                // Update epoch tree
                await epochTree.update(epochKey, sealedHashChainResult)
            }

            const intermediateUserStateTreeRoot = genRandomSalt()
            intermediateUserStateTreeRoots.push(intermediateUserStateTreeRoot)
            blindedUserState.push(hash5([user['identityNullifier'], intermediateUserStateTreeRoot, BigInt(epoch), BigInt(endEpochKeyNonce)]))

            // Compute new GST Leaf
            const latestUSTRoot = intermediateUserStateTreeRoots[1]
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
                    start_epoch_key_nonce: startEpochKeyNonce,
                    end_epoch_key_nonce: endEpochKeyNonce,
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