// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { Circuit } from '@unirep/circuits'
import {
    genRandomNumber,
    hashLeftRight,
    ZkIdentity,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
} from '@unirep/circuits/config'

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
        stateRoot = genRandomNumber()

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
            let tx = await unirepContract.submitEpochKeyProof(input)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                input
            )
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true

            const pfIdx = await unirepContract.getProofIndex(input.hash())
            expect(Number(pfIdx)).not.eq(0)
        }
    })

    it('Invalid epoch key should not pass check', async () => {
        // Validate against invalid epoch key
        const invalidEpochKey1 = maxEPK
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            nonce
        )
        invalidCircuitInputs.epoch_key = invalidEpochKey1

        input = await genInputForContract(
            Circuit.verifyEpochKey,
            invalidCircuitInputs
        )
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input)
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })

    it('Wrong Id should not pass check', async () => {
        const fakeId = new ZkIdentity()
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            fakeId,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            nonce
        )

        input = await genInputForContract(
            Circuit.verifyEpochKey,
            invalidCircuitInputs
        )
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input)
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })

    it('Mismatched GST tree root should not pass check', async () => {
        const otherTreeRoot = genRandomNumber()
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
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input)
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
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
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input)
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })
})
