// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import {
    genInputForContract,
    genProcessAttestationsCircuitInput,
} from './utils'
import { deployUnirep, ProcessAttestationsProof, Unirep } from '../src'
import { Circuit, NUM_ATTESTATIONS_PER_PROOF } from '@unirep/circuits'

describe('Process attestation circuit', function () {
    this.timeout(300000)

    let accounts: ethers.Signer[]
    let unirepContract: Unirep

    const epoch = BigInt(1)
    const nonce = BigInt(0)
    const user = new ZkIdentity()

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])
    })

    it('successfully process attestations', async () => {
        const { circuitInputs } = genProcessAttestationsCircuitInput(
            user,
            epoch,
            nonce,
            nonce
        )

        const input = await genInputForContract(
            Circuit.processAttestations,
            circuitInputs
        )
        const isProofValid = await unirepContract.verifyProcessAttestationProof(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true

        const tx = await unirepContract.processAttestations(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const pfIdx = await unirepContract.getProofIndex(input.hash())
        expect(Number(pfIdx)).not.eq(0)
    })

    it('successfully process zero attestations', async () => {
        let zeroSelectors: number[] = []
        for (let i = 0; i < NUM_ATTESTATIONS_PER_PROOF; i++) {
            zeroSelectors.push(0)
        }
        const { circuitInputs } = genProcessAttestationsCircuitInput(
            user,
            epoch,
            nonce,
            nonce,
            zeroSelectors
        )
        const input = await genInputForContract(
            Circuit.processAttestations,
            circuitInputs
        )
        const isProofValid = await unirepContract.verifyProcessAttestationProof(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true

        const tx = await unirepContract.processAttestations(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const pfIdx = await unirepContract.getProofIndex(input.hash())
        expect(Number(pfIdx)).not.eq(0)
    })

    it('submitting invalid process attestations proof should fail', async () => {
        const { circuitInputs } = genProcessAttestationsCircuitInput(
            user,
            epoch,
            nonce,
            nonce
        )

        const input: ProcessAttestationsProof = await genInputForContract(
            Circuit.processAttestations,
            circuitInputs
        )
        input.publicSignals[input.idx.inputBlindedUserState] = genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyProcessAttestationProof(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false

        await expect(
            unirepContract.processAttestations(
                input.publicSignals,
                input.proof
            )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })
})
