import { expect } from 'chai'
import { genIdentity, genIdentityCommitment, IncrementalQuinTree, genRandomSalt, hashLeftRight, stringifyBigInts } from '@unirep/crypto'
import { Circuit, genProofAndPublicSignals,verifyProof } from '@unirep/circuits'

import { circuitGlobalStateTreeDepth } from "../../config/testLocal"
import { genNewUserStateTree } from "../utils"
import { Reputation } from "../../core"

describe('User State Transition circuits', function () {
    this.timeout(600000)

    const user = genIdentity()

    describe('Start User State Transition', () => {

        const epoch = BigInt(1)
        const expectedNumAttestationsMade = 5

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree, GSTreeRoot, GSTreeProof
        let userStateTree

        let reputationRecords = {}
        let hashedLeaf
        const zeroHashChain = BigInt(0)
        const nonce = BigInt(0)
        const signUp = 1

        before(async () => {
            // User state tree
            userStateTree = await genNewUserStateTree("circuit")

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

            // Global state tree
            GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
            const commitment = genIdentityCommitment(user)
            hashedLeaf = hashLeftRight(commitment, userStateTree.getRootHash())
            GSTree.insert(hashedLeaf)
            GSTreeProof = GSTree.genMerklePath(0)
            GSTreeRoot = GSTree.root
        })

        describe('Start process user state tree', () => {
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = {
                    epoch: epoch,
                    nonce: nonce,
                    user_tree_root: userStateTree.getRootHash(),
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot
                }
                const startTime = new Date().getTime()
                const results = await genProofAndPublicSignals(Circuit.startTransition, stringifyBigInts(circuitInputs))
                const endTime = new Date().getTime()
                console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
                const isValid = await verifyProof(Circuit.startTransition, results['proof'], results['publicSignals'])
                expect(isValid).to.be.true
            })

            it('User can start with different epoch key nonce', async () => {
                const newNonce = BigInt(1)
                const circuitInputs = {
                    epoch: epoch,
                    nonce: newNonce,
                    user_tree_root: userStateTree.getRootHash(),
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot
                }
                const startTime = new Date().getTime()
                const results = await genProofAndPublicSignals(Circuit.startTransition, stringifyBigInts(circuitInputs))
                const endTime = new Date().getTime()
                console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
                const isValid = await verifyProof(Circuit.startTransition, results['proof'], results['publicSignals'])
                expect(isValid).to.be.true
            })
        })
    })
})