// @ts-ignore
import { ethers as hardhatEthers, run } from 'hardhat'
import { expect } from 'chai'
import {
    hashLeftRight,
    ZkIdentity,
    SparseMerkleTree,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import { Circuit, GLOBAL_STATE_TREE_DEPTH } from '@unirep/circuits'

import {
    genStartTransitionCircuitInput,
    bootstrapRandomUSTree,
    genInputForContract,
} from './utils'
import { StartTransitionProof, Unirep } from '../src'

describe('User State Transition circuits', function () {
    this.timeout(60000)

    const user = new ZkIdentity()

    describe('Start User State Transition', () => {
        let unirepContract: Unirep
        const epoch = 1

        let GSTree: IncrementalMerkleTree
        let userStateTree: SparseMerkleTree

        let hashedLeaf
        const nonce = 0
        const leafIndex = 0

        before(async () => {
            unirepContract = await run('deploy:Unirep')

            // User state tree
            const results = await bootstrapRandomUSTree()
            userStateTree = results.userStateTree

            // Global state tree
            GSTree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
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

                const input = await genInputForContract(
                    Circuit.startTransition,
                    circuitInputs
                )
                const isProofValid =
                    await unirepContract.verifyStartTransitionProof(
                        input.publicSignals,
                        input.proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.startUserStateTransition(
                    input.publicSignals,
                    input.proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const pfIdx = await unirepContract.getProofIndex(input.hash())
                expect(Number(pfIdx)).not.eq(0)
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

                const input: StartTransitionProof = await genInputForContract(
                    Circuit.startTransition,
                    circuitInputs
                )
                const isProofValid =
                    await unirepContract.verifyStartTransitionProof(
                        input.publicSignals,
                        input.proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.startUserStateTransition(
                    input.publicSignals,
                    input.proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const pfIdx = await unirepContract.getProofIndex(input.hash())
                expect(Number(pfIdx)).not.eq(0)
            })
        })
    })
})
