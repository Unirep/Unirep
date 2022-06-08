// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    hashLeftRight,
    ZkIdentity,
    SparseMerkleTree,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    genInputForContract,
    deploy,
    bootstrapRandomUSTree,
    genStartTransitionCircuitInput,
    keccak256Hash,
} from './utils'
import { Unirep } from '../src'
import { config } from './testConfig'
import { CircuitName } from '../../circuits/src'

describe('User State Transition circuits', function () {
    this.timeout(60000)

    const user = new ZkIdentity()

    describe('Start User State Transition', () => {
        let accounts: ethers.Signer[]
        let unirepContract: Unirep
        const epoch = 1

        let GSTree: IncrementalMerkleTree
        let userStateTree: SparseMerkleTree

        let hashedLeaf
        const nonce = 0
        const leafIndex = 0

        before(async () => {
            accounts = await hardhatEthers.getSigners()

            unirepContract = await deploy(accounts[0], config)

            // User state tree
            const results = await bootstrapRandomUSTree()
            userStateTree = results.userStateTree

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

                const {
                    blindedUserState,
                    blindedHashChain,
                    globalStateTree,
                    proof,
                } = await genInputForContract(
                    CircuitName.startTransition,
                    circuitInputs
                )
                const isProofValid =
                    await unirepContract.verifyStartTransitionProof(
                        blindedUserState,
                        blindedHashChain,
                        globalStateTree,
                        proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.startUserStateTransition(
                    blindedUserState,
                    blindedHashChain,
                    globalStateTree,
                    proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const input = {
                    blindedUserState,
                    blindedHashChain,
                    globalStateTree,
                    proof,
                }
                const pfIdx = await unirepContract.getProofIndex(
                    keccak256Hash(CircuitName.startTransition, input)
                )
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

                const {
                    blindedUserState,
                    blindedHashChain,
                    globalStateTree,
                    proof,
                } = await genInputForContract(
                    CircuitName.startTransition,
                    circuitInputs
                )
                const isProofValid =
                    await unirepContract.verifyStartTransitionProof(
                        blindedUserState,
                        blindedHashChain,
                        globalStateTree,
                        proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.startUserStateTransition(
                    blindedUserState,
                    blindedHashChain,
                    globalStateTree,
                    proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const input = {
                    blindedUserState,
                    blindedHashChain,
                    globalStateTree,
                    proof,
                }
                const pfIdx = await unirepContract.getProofIndex(
                    keccak256Hash(CircuitName.startTransition, input)
                )
                expect(Number(pfIdx)).not.eq(0)
            })
        })
    })
})
