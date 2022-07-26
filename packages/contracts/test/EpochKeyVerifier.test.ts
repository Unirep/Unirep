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
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    Circuit,
} from '@unirep/circuits'

import { genEpochKeyCircuitInput, genInputForContract } from './utils'
import { EpochKeyProof, deployUnirep, Unirep } from '../src'

describe('Verify Epoch Key verifier', function () {
    this.timeout(30000)

    const maxEPK = BigInt(2 ** EPOCH_TREE_DEPTH)

    let unirepContract: Unirep
    let accounts: ethers.Signer[]
    let id, commitment, stateRoot
    let tree
    let nonce, currentEpoch
    let leafIndex = 0
    let input: EpochKeyProof

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])
        tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        id = new ZkIdentity()
        commitment = id.genIdentityCommitment()
        stateRoot = genRandomSalt()

        const hashedStateLeaf = hashLeftRight(
            commitment.toString(),
            stateRoot.toString()
        )
        tree.insert(BigInt(hashedStateLeaf.toString()))
        nonce = 0
        currentEpoch = 1
    })

    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            const n = i
            const circuitInputs = genEpochKeyCircuitInput(
                id,
                tree,
                leafIndex,
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
            let tx = await unirepContract.submitEpochKeyProof(
                input.publicSignals,
                input.proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                input.publicSignals,
                input.proof
            )
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true

            const pfIdx = await unirepContract.getProofIndex(input.hash())
            expect(Number(pfIdx)).not.eq(0)
        }
    })

    it('Mismatched GST tree root should be output', async () => {
        const otherTreeRoot = genRandomSalt()
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
        const isProofValid = await unirepContract.verifyEpochKeyValidity(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true
        expect(input.publicSignals[1]).to.not.equal(otherTreeRoot)
    })

    it('Invalid epoch should not pass check', async () => {
        const invalidNonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
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
        const isProofValid = await unirepContract.verifyEpochKeyValidity(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })
})
