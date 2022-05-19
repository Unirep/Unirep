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
import { CircuitName } from '@unirep/circuits'

import {
    genStartTransitionCircuitInput,
    bootstrapRandomUSTree,
    genInputForContract,
} from './utils'
import { computeStartTransitionProofHash, deployUnirep, Unirep } from '../src'
import config from '../src/config'

describe('User State Transition circuits', function () {
    this.timeout(60000)

    const user = new ZkIdentity()

    describe('Start User State Transition', () => {
        let accounts: ethers.Signer[]
        let unirepContract: Unirep
        const epoch = 1

        let GSTZERO_VALUE = 0,
            GSTree: IncrementalMerkleTree
        let userStateTree: SparseMerkleTree

        let hashedLeaf
        const nonce = 0
        const leafIndex = 0

        before(async () => {
            accounts = await hardhatEthers.getSigners()

            unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])

            // User state tree
            const results = await bootstrapRandomUSTree()
            userStateTree = results.userStateTree

            // Global state tree
            GSTree = new IncrementalMerkleTree(
                config.globalStateTreeDepth,
                GSTZERO_VALUE,
                2
            )
            const commitment = user.genIdentityCommitment()
            hashedLeaf = hashLeftRight(commitment, userStateTree.getRootHash())
            GSTree.insert(hashedLeaf)
        })

        describe('Start process user state tree', () => {
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = genStartTransitionCircuitInput(
                    user,
                    GSTree,
                    leafIndex,
                    userStateTree.getRootHash(),
                    epoch,
                    nonce
                )

                const { blindedUserState, blindedHashChain, GSTRoot, proof } =
                    await genInputForContract(
                        CircuitName.startTransition,
                        circuitInputs
                    )
                const isProofValid =
                    await unirepContract.verifyStartTransitionProof(
                        blindedUserState,
                        blindedHashChain,
                        GSTRoot,
                        proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.startUserStateTransition(
                    blindedUserState,
                    blindedHashChain,
                    GSTRoot,
                    proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const pfIdx = await unirepContract.getProofIndex(
                    computeStartTransitionProofHash(
                        blindedUserState,
                        blindedHashChain,
                        GSTRoot,
                        proof
                    )
                )
                expect(Number(pfIdx)).not.eq(0)
            })

            it('User can start with different epoch key nonce', async () => {
                const newNonce = 1
                const circuitInputs = genStartTransitionCircuitInput(
                    user,
                    GSTree,
                    leafIndex,
                    userStateTree.getRootHash(),
                    epoch,
                    newNonce
                )

                const { blindedUserState, blindedHashChain, GSTRoot, proof } =
                    await genInputForContract(
                        CircuitName.startTransition,
                        circuitInputs
                    )
                const isProofValid =
                    await unirepContract.verifyStartTransitionProof(
                        blindedUserState,
                        blindedHashChain,
                        GSTRoot,
                        proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.startUserStateTransition(
                    blindedUserState,
                    blindedHashChain,
                    GSTRoot,
                    proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const pfIdx = await unirepContract.getProofIndex(
                    computeStartTransitionProofHash(
                        blindedUserState,
                        blindedHashChain,
                        GSTRoot,
                        proof
                    )
                )
                expect(Number(pfIdx)).not.eq(0)
            })
        })
    })
})
