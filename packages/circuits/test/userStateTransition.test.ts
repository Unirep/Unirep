import * as path from 'path'
import { expect } from 'chai'
import {
    genRandomSalt,
    hashLeftRight,
    ZkIdentity,
    SparseMerkleTree,
    SnarkBigInt,
} from '@unirep/crypto'

import UnirepCircuit, { CircuitName } from '../src'
import {
    genNewEpochTree,
    genEpochKey,
    genUserStateTransitionCircuitInput,
    genProofAndVerify,
} from './utils'

import config from '../zksnarkBuild/config.json'
const circuitPath = path.join(
    config.exportBuildPath,
    `${CircuitName.userStateTransition}_main.circom`
)
import testConfig from '../circuits/test/testConfig.json'
const epkExistsCircuitPath = path.join(
    __dirname,
    '../circuits/test/epochKeyExists_test.circom'
)

describe('User State Transition circuits', function () {
    this.timeout(600000)

    const epoch = 1
    const user: ZkIdentity = new ZkIdentity()

    describe('Epoch key exists', () => {
        let circuit

        const nonce = testConfig.numEpochKeyNoncePerEpoch - 1
        const epochKey: SnarkBigInt = genEpochKey(
            user.identityNullifier,
            epoch,
            nonce,
            testConfig.epochTreeDepth
        )

        let epochTree: SparseMerkleTree, epochTreeRoot, epochTreePathElements

        let hashChainResult: SnarkBigInt

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await UnirepCircuit.compileAndLoadCircuit(
                epkExistsCircuitPath
            )
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(
                `Compile time: ${endCompileTime - startCompileTime} seconds`
            )

            // Epoch tree
            epochTree = genNewEpochTree(testConfig.epochTreeDepth)

            hashChainResult = genRandomSalt()

            await epochTree.update(epochKey, hashChainResult)

            epochTreePathElements = await epochTree.createProof(epochKey)
            epochTreeRoot = epochTree.root
        })

        it('Existed epoch key should pass check', async () => {
            const circuitInputs = {
                identity_nullifier: user.identityNullifier,
                epoch: epoch,
                nonce: nonce,
                hash_chain_result: hashChainResult,
                epoch_tree_root: epochTreeRoot,
                path_elements: epochTreePathElements,
            }

            await UnirepCircuit.executeCircuit(circuit, circuitInputs)
        })
    })

    describe('User State Transition', () => {
        let circuit
        let circuitInputs

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await UnirepCircuit.compileAndLoadCircuit(circuitPath)
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(
                `Compile time: ${endCompileTime - startCompileTime} seconds`
            )

            circuitInputs = await genUserStateTransitionCircuitInput(
                user,
                epoch
            )
        })

        describe('Process user state transition proof', () => {
            it('Valid user state update inputs should work', async () => {
                const witness = await UnirepCircuit.executeCircuit(
                    circuit,
                    circuitInputs
                )

                const commitment = user.genIdentityCommitment()
                const newGSTLeaf = hashLeftRight(
                    commitment,
                    circuitInputs.intermediate_user_state_tree_roots[1]
                )
                const _newGSTLeaf = UnirepCircuit.getSignalByName(
                    circuit,
                    witness,
                    'main.new_GST_leaf'
                )
                expect(_newGSTLeaf, 'new GST leaf mismatch').to.equal(
                    newGSTLeaf
                )

                const isValid = await genProofAndVerify(
                    CircuitName.userStateTransition,
                    circuitInputs
                )
                expect(isValid).to.be.true
            })
        })
    })
})
