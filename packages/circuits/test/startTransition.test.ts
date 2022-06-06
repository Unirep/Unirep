import * as path from 'path'
import { expect } from 'chai'
import {
    hash5,
    hashLeftRight,
    ZkIdentity,
    SparseMerkleTree,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import {
    UnirepCircuit,
    genStartTransitionCircuitInput,
    bootstrapRandomUSTree,
    genProofAndVerify,
} from './utils'
import { CircuitName } from '../src'
import { exportBuildPath } from './buildTestCircuits'

const config = UnirepCircuit.getConfig(exportBuildPath)
const circuitPath = path.join(
    exportBuildPath,
    `${CircuitName.startTransition}_test.circom`
)

describe('User State Transition circuits', function () {
    this.timeout(60000)

    const user: ZkIdentity = new ZkIdentity()

    describe('Start User State Transition', () => {
        let circuit
        const epoch = 1

        let GSTZERO_VALUE = 0,
            GSTree: IncrementalMerkleTree
        let userStateTree: SparseMerkleTree

        let hashedLeaf
        const zeroHashChain = BigInt(0)
        const nonce = 0
        const leafIndex = 0

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await UnirepCircuit.compileAndLoadCircuit(circuitPath)
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(
                `Compile time: ${endCompileTime - startCompileTime} seconds`
            )

            // User state tree
            userStateTree = await bootstrapRandomUSTree()

            // Global state tree
            GSTree = new IncrementalMerkleTree(config.globalStateTreeDepth)
            const commitment = user.genIdentityCommitment()
            hashedLeaf = hashLeftRight(commitment, userStateTree.root)
            GSTree.insert(hashedLeaf)
        })

        describe('Start process user state tree', () => {
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = genStartTransitionCircuitInput(
                    user,
                    GSTree,
                    leafIndex,
                    userStateTree.root,
                    epoch,
                    nonce
                )

                const witness = await UnirepCircuit.executeCircuit(
                    circuit,
                    circuitInputs
                )
                const outputUserState = UnirepCircuit.getSignalByName(
                    circuit,
                    witness,
                    'main.blinded_user_state'
                )
                const expectedUserState = hash5([
                    user.identityNullifier,
                    userStateTree.root,
                    BigInt(epoch),
                    BigInt(nonce),
                ])
                expect(outputUserState).to.equal(expectedUserState)

                const outputHashChainResult = UnirepCircuit.getSignalByName(
                    circuit,
                    witness,
                    'main.blinded_hash_chain_result'
                )
                const expectedHashChainResult = hash5([
                    user.identityNullifier,
                    zeroHashChain,
                    BigInt(epoch),
                    BigInt(nonce),
                ])
                expect(outputHashChainResult).to.equal(expectedHashChainResult)

                const isValid = await genProofAndVerify(
                    CircuitName.startTransition,
                    circuitInputs
                )
                expect(isValid).to.be.true
            })

            it('User can start with different epoch key nonce', async () => {
                const newNonce = 1
                const circuitInputs = genStartTransitionCircuitInput(
                    user,
                    GSTree,
                    leafIndex,
                    userStateTree.root,
                    epoch,
                    newNonce
                )

                const witness = await UnirepCircuit.executeCircuit(
                    circuit,
                    circuitInputs
                )
                const outputUserState = UnirepCircuit.getSignalByName(
                    circuit,
                    witness,
                    'main.blinded_user_state'
                )
                const expectedUserState = hash5([
                    user.identityNullifier,
                    userStateTree.root,
                    BigInt(epoch),
                    BigInt(newNonce),
                ])
                expect(outputUserState).to.equal(expectedUserState)

                const outputHashChainResult = UnirepCircuit.getSignalByName(
                    circuit,
                    witness,
                    'main.blinded_hash_chain_result'
                )
                const expectedHashChainResult = hash5([
                    user.identityNullifier,
                    zeroHashChain,
                    BigInt(epoch),
                    BigInt(newNonce),
                ])
                expect(outputHashChainResult).to.equal(expectedHashChainResult)
            })
        })
    })
})
