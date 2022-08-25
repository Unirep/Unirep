// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    hashLeftRight,
    ZkIdentity,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    GLOBAL_STATE_TREE_DEPTH,
    Circuit,
} from '@unirep/circuits'

import {
    genEpochKeyCircuitInput,
    genInputForContract,
    genNewUserStateTree,
} from './utils'
import { EpochKeyProof, Unirep } from '../src'
import { deployUnirep } from '../src/deploy'

describe('Verify Epoch Key verifier', function () {
    this.timeout(30000)

    let unirepContract: Unirep
    let accounts: ethers.Signer[]
    let tree: IncrementalMerkleTree = new IncrementalMerkleTree(
        GLOBAL_STATE_TREE_DEPTH
    )
    let currentEpoch = 1
    let input: EpochKeyProof

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])
    })

    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            const n = i
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()

            {
                const tx = await unirepContract['userSignUp(uint256)'](
                    commitment
                )
                await tx.wait()
            }
            const stateRoot = genNewUserStateTree().root
            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            tree.insert(hashedStateLeaf)
            const circuitInputs = genEpochKeyCircuitInput(
                id,
                tree,
                i,
                stateRoot,
                currentEpoch,
                n
            )

            input = await genInputForContract(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            const isValid = await input.verify()
            expect(isValid, 'Verify epoch key proof off-chain failed').to.be
                .true
            await unirepContract.assertValidEpochKeyProof(
                input.publicSignals,
                input.proof
            )
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                input.publicSignals,
                input.proof
            )
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
        }
    })

    it('Mismatched GST tree root should be output', async () => {
        const otherTreeRoot = genRandomSalt()
        const id = new ZkIdentity()
        const leafIndex = 0
        const nonce = 0
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            otherTreeRoot,
            currentEpoch,
            nonce
        )

        input = await genInputForContract(
            Circuit.verifyEpochKey,
            invalidCircuitInputs
        )
        await expect(
            unirepContract.assertValidEpochKeyProof(
                input.publicSignals,
                input.proof
            )
        ).to.be.revertedWithCustomError(
            unirepContract,
            `InvalidGlobalStateTreeRoot`
        )
        const isProofValid = await unirepContract.verifyEpochKeyValidity(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true
        expect(input.publicSignals[1]).to.not.equal(otherTreeRoot)
    })

    it('Invalid epoch should not pass check', async () => {
        const invalidEpoch = currentEpoch + 1
        const id = new ZkIdentity()
        const leafIndex = 0
        const nonce = 0
        const stateRoot = genRandomSalt()
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            invalidEpoch,
            nonce
        )

        input = await genInputForContract(
            Circuit.verifyEpochKey,
            invalidCircuitInputs
        )
        await expect(
            unirepContract.assertValidEpochKeyProof(
                input.publicSignals,
                input.proof
            )
        ).to.be.revertedWithCustomError(unirepContract, `EpochNotMatch`)
        const isProofValid = await unirepContract.verifyEpochKeyValidity(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid, 'Verify epk proof on-chain should succeed').to.be
            .true
    })

    it('Invalid nonce should not pass check', async () => {
        const invalidNonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        {
            const tx = await unirepContract['userSignUp(uint256)'](commitment)
            await tx.wait()
        }
        const stateRoot = genNewUserStateTree().root
        const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
        tree.insert(hashedStateLeaf)
        const leafIndex = tree.indexOf(hashedStateLeaf)
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            invalidNonce
        )

        input = await genInputForContract(
            Circuit.verifyEpochKey,
            invalidCircuitInputs
        )
        await expect(
            unirepContract.assertValidEpochKeyProof(
                input.publicSignals,
                input.proof
            )
        ).to.be.revertedWithCustomError(unirepContract, `InvalidProof`)
        const isProofValid = await unirepContract.verifyEpochKeyValidity(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })
})
