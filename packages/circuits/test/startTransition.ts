import * as path from 'path'
import { expect } from "chai"
import { hash5, hashLeftRight, genIdentity, genIdentityCommitment, SparseMerkleTreeImpl, IncrementalQuinTree } from "@unirep/crypto"
import { executeCircuit, getSignalByName, Circuit } from "../circuits/utils"
import { compileAndLoadCircuit, genStartTransitionCircuitInput, bootstrapRandomUSTree, genProofAndVerify } from './utils'
import { circuitGlobalStateTreeDepth, startTransitionCircuitPath } from "../config/"

const circuitPath = path.join(__dirname, startTransitionCircuitPath)

describe('User State Transition circuits', function () {
    this.timeout(60000)

    const user = genIdentity()

    describe('Start User State Transition', () => {

        let circuit
        const epoch = 1

        let GSTZERO_VALUE = 0, GSTree: IncrementalQuinTree
        let userStateTree: SparseMerkleTreeImpl

        let hashedLeaf
        const zeroHashChain = BigInt(0)
        const nonce = 0
        const leafIndex = 0

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit(circuitPath)
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

            // User state tree
            userStateTree = await bootstrapRandomUSTree()

            // Global state tree
            GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
            const commitment = genIdentityCommitment(user)
            hashedLeaf = hashLeftRight(commitment, userStateTree.getRootHash())
            GSTree.insert(hashedLeaf)
        })

        describe('Start process user state tree', () => {
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = genStartTransitionCircuitInput(user, GSTree, leafIndex, userStateTree.getRootHash(), epoch, nonce)

                const witness = await executeCircuit(circuit, circuitInputs)
                const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
                const expectedUserState = hash5([user['identityNullifier'], userStateTree.getRootHash(), BigInt(epoch), BigInt(nonce)])
                expect(outputUserState).to.equal(expectedUserState)

                const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
                const expectedHashChainResult = hash5([user['identityNullifier'], zeroHashChain, BigInt(epoch), BigInt(nonce)])
                expect(outputHashChainResult).to.equal(expectedHashChainResult)

                const isValid = await genProofAndVerify(Circuit.startTransition, circuitInputs)
                expect(isValid).to.be.true
                
            })

            it('User can start with different epoch key nonce', async () => {
                const newNonce = 1
                const circuitInputs = genStartTransitionCircuitInput(user, GSTree, leafIndex, userStateTree.getRootHash(), epoch, newNonce)

                const witness = await executeCircuit(circuit, circuitInputs)
                const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
                const expectedUserState = hash5([user['identityNullifier'], userStateTree.getRootHash(), BigInt(epoch), BigInt(newNonce)])
                expect(outputUserState).to.equal(expectedUserState)

                const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
                const expectedHashChainResult = hash5([user['identityNullifier'], zeroHashChain, BigInt(epoch), BigInt(newNonce)])
                expect(outputHashChainResult).to.equal(expectedHashChainResult)
            })
        })
    })
})