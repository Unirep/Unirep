import chai from "chai"

const { expect } = chai

import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import {
    IncrementalQuinTree,
    genRandomSalt,
    hashLeftRight,
    hash5,
} from 'maci-crypto'

import {
    compileAndLoadCircuit,
    executeCircuit,
    getSignalByName,
} from './utils'
import { circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch } from "../../config/testLocal"
import { genNewUserStateTree } from "../utils"
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { Reputation } from "../../core"

describe('User State Transition circuits', function () {
    this.timeout(600000)

    const user = genIdentity()

    describe('Start User State Transition', () => {

        let circuit
        const expectedNumAttestationsMade = 5

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree, GSTreeRoot, GSTreeProof
        let userStateTree: SparseMerkleTreeImpl

        let reputationRecords = {}
        let hashedLeaf
        const nonce = 0

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/startTransition_test.circom')
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

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
                    nonce: nonce,
                    user_tree_root: userStateTree.getRootHash(),
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot
                }
                const witness = await executeCircuit(circuit, circuitInputs)
                const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
                const expectedUserState = hash5([user['identityNullifier'], userStateTree.getRootHash(), nonce])
                expect(outputUserState).to.equal(expectedUserState)

                const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
                const expectedHashChainResult = hash5([user['identityNullifier'], 0, nonce])
                expect(outputHashChainResult).to.equal(expectedHashChainResult)
            })

            it('User can start with different epoch key nonce', async () => {
                const newNonce = 1
                const circuitInputs = {
                    nonce: newNonce,
                    user_tree_root: userStateTree.getRootHash(),
                    identity_pk: user['keypair']['pubKey'],
                    identity_nullifier: user['identityNullifier'],
                    identity_trapdoor: user['identityTrapdoor'],
                    GST_path_elements: GSTreeProof.pathElements,
                    GST_path_index: GSTreeProof.indices,
                    GST_root: GSTreeRoot
                }
                const witness = await executeCircuit(circuit, circuitInputs)
                const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
                const expectedUserState = hash5([user['identityNullifier'], userStateTree.getRootHash(), newNonce])
                expect(outputUserState).to.equal(expectedUserState)

                const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
                const expectedHashChainResult = hash5([user['identityNullifier'], 0, newNonce])
                expect(outputHashChainResult).to.equal(expectedHashChainResult)
            })
        })
    })
})