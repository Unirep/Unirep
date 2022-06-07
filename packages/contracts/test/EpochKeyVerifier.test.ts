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
    deploy,
    genEpochKeyCircuitInput,
    genIdentity,
    genInputForContract,
    genProof,
    verifyProof,
} from './utils'
import { Unirep, UnirepTypes } from '../src'
import { circuitConfig, config } from './testConfig'
import { CircuitName } from '../../circuits/src'

describe('Verify Epoch Key verifier', function () {
    this.timeout(30000)

    const maxEPK = BigInt(2 ** config.epochTreeDepth)

    let unirepContract: Unirep
    let accounts: ethers.Signer[]
    const { id, commitment } = genIdentity()
    let stateRoot = genRandomSalt()
    let tree
    let nonce = 0
    let currentEpoch = 1
    let leafIndex = 0
    let input: UnirepTypes.EpochKeyProofStruct

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], config)

        const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
        tree = new IncrementalMerkleTree(config.globalStateTreeDepth)
        tree.insert(hashedStateLeaf)
    })

    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            const n = i
            const circuitInputs = genEpochKeyCircuitInput(
                id,
                tree,
                leafIndex,
                stateRoot,
                currentEpoch,
                n,
                circuitConfig
            )

            input = await genInputForContract(
                CircuitName.verifyEpochKey,
                circuitInputs
            )
            const { proof, publicSignals } = await genProof(
                CircuitName.verifyEpochKey,
                circuitInputs
            )
            const isValid = await verifyProof(
                CircuitName.verifyEpochKey,
                publicSignals,
                proof
            )
            expect(isValid, 'Verify epoch key proof off-chain failed').to.be
                .true

            let tx = await unirepContract.submitEpochKeyProof(input)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                input
            )
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true

            const hash = await unirepContract.hashEpochKeyProof(input)
            const pfIdx = await unirepContract.getProofIndex(hash)
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
            nonce,
            circuitConfig
        )
        invalidCircuitInputs.epoch_key = invalidEpochKey1

        input = await genInputForContract(
            CircuitName.verifyEpochKey,
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
            nonce,
            circuitConfig
        )

        input = await genInputForContract(
            CircuitName.verifyEpochKey,
            invalidCircuitInputs
        )
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input)
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })

    it('Mismatched GST tree root should not pass check', async () => {
        const otherTreeRoot = genRandomSalt()
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            otherTreeRoot,
            currentEpoch,
            nonce,
            circuitConfig
        )

        input = await genInputForContract(
            CircuitName.verifyEpochKey,
            invalidCircuitInputs
        )
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input)
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })

    it('Invalid epoch should not pass check', async () => {
        const invalidNonce = config.numEpochKeyNoncePerEpoch
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            invalidNonce,
            circuitConfig
        )

        input = await genInputForContract(
            CircuitName.verifyEpochKey,
            invalidCircuitInputs
        )
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input)
        expect(isProofValid, 'Verify epk proof on-chain should fail').to.be
            .false
    })
})
