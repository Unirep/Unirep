// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    hashLeftRight,
    ZkIdentity,
    SparseMerkleTree,
    IncrementalMerkleTree,
    genRandomSalt,
} from '@unirep/crypto'
import { Circuit, GLOBAL_STATE_TREE_DEPTH } from '@unirep/circuits'

import {
    genStartTransitionCircuitInput,
    bootstrapRandomUSTree,
    genInputForContract,
    genUserStateTransitionCircuitInput,
} from './utils'
import { StartTransitionProof, Unirep } from '../src'
import { deployUnirep } from '../deploy'

describe('User State Transition circuits', function () {
    this.timeout(60000)

    const user = new ZkIdentity()
    let accounts: ethers.Signer[]
    let unirepContract: Unirep
    const epoch = 1

    let GSTree: IncrementalMerkleTree
    let userStateTree: SparseMerkleTree

    let hashedLeaf

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])

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
            const { startTransitionCircuitInputs: circuitInputs } =
                genUserStateTransitionCircuitInput(user, epoch)

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

            const blindedUserStateExists =
                await unirepContract.submittedBlindedUserStates(
                    input.blindedUserState
                )
            expect(blindedUserStateExists).to.be.true
            const blindedHashChainExists =
                await unirepContract.submittedBlindedHashChains(
                    input.blindedHashChain
                )
            expect(blindedHashChainExists).to.be.true

            // submit proof again should fail
            await expect(
                unirepContract.startUserStateTransition(
                    input.publicSignals,
                    input.proof
                )
            ).to.be.revertedWithCustomError(unirepContract, 'ProofAlreadyUsed')
        })

        it('User can start with different epoch key nonce', async () => {
            const newNonce = 1
            const { circuitInputs } = genStartTransitionCircuitInput(
                user,
                epoch,
                newNonce,
                userStateTree.root,
                GSTree.createProof(0)
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

        it('submitting invalid start transition proof should fail', async () => {
            const newNonce = 1
            const { circuitInputs } = genStartTransitionCircuitInput(
                user,
                epoch,
                newNonce,
                userStateTree.root,
                GSTree.createProof(0)
            )

            const input: StartTransitionProof = await genInputForContract(
                Circuit.startTransition,
                circuitInputs
            )
            input.publicSignals[input.idx.globalStateTree] =
                genRandomSalt().toString()
            const isProofValid =
                await unirepContract.verifyStartTransitionProof(
                    input.publicSignals,
                    input.proof
                )
            expect(isProofValid).to.be.false

            await expect(
                unirepContract.startUserStateTransition(
                    input.publicSignals,
                    input.proof
                )
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
        })
    })
})
