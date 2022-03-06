import * as path from 'path'
import { expect } from "chai"
import { genRandomSalt, hashLeftRight, genIdentity, genIdentityCommitment, SparseMerkleTreeImpl, SnarkBigInt } from "@unirep/crypto"
import { executeCircuit, getSignalByName, Circuit } from "../circuits/utils"
import { genNewEpochTree, genEpochKey, compileAndLoadCircuit, genUserStateTransitionCircuitInput, genProofAndVerify } from './utils'
import { numEpochKeyNoncePerEpoch, userStateTransitionCircuitPath } from "../config/"

const epkExistsCircuitPath = path.join(__dirname, '../circuits/test/epochKeyExists_test.circom')
const USTCircuitPath = path.join(__dirname, userStateTransitionCircuitPath)

describe('User State Transition circuits', function () {
    this.timeout(600000)

    const epoch = 1
    const user = genIdentity()

    describe('Epoch key exists', () => {

        let circuit

        const nonce = numEpochKeyNoncePerEpoch - 1
        const testEpochTreeDepth = 32
        const epochKey: SnarkBigInt = genEpochKey(user['identityNullifier'], epoch, nonce, testEpochTreeDepth)

        let epochTree: SparseMerkleTreeImpl, epochTreeRoot, epochTreePathElements

        let hashChainResult: SnarkBigInt

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit(epkExistsCircuitPath)
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

            // Epoch tree
            epochTree = await genNewEpochTree(testEpochTreeDepth)

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


            await executeCircuit(circuit, circuitInputs)
        })
    })

    describe('User State Transition', () => {

        let circuit
        let circuitInputs

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit(USTCircuitPath)
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

            circuitInputs = await genUserStateTransitionCircuitInput(user, epoch)
        })

        describe('Process user state transition proof', () => {
            it('Valid user state update inputs should work', async () => {
                const witness = await executeCircuit(circuit, circuitInputs)

                const commitment = genIdentityCommitment(user)
                const newGSTLeaf = hashLeftRight(commitment, circuitInputs.intermediate_user_state_tree_roots[1])
                const _newGSTLeaf = getSignalByName(circuit, witness, 'main.new_GST_leaf')
                expect(_newGSTLeaf, 'new GST leaf mismatch').to.equal(newGSTLeaf)

                const isValid = await genProofAndVerify(Circuit.userStateTransition, circuitInputs)
                expect(isValid).to.be.true
            })
        })
    })
})