// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from "chai"
import { genIdentity } from "@unirep/crypto"
import { Circuit } from "@unirep/circuits"
import { genInputForContract,genProcessAttestationsCircuitInput, getTreeDepthsForTesting } from './utils'
import { numAttestationsPerProof } from "../config"
import { computeProcessAttestationsProofHash, deployUnirep } from '../src'

describe('Process attestation circuit', function () {
    this.timeout(300000)

    let accounts
    let unirepContract

    const epoch = BigInt(1)
    const nonce = BigInt(0)
    const user = genIdentity()

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
    })

    it('successfully process attestations', async () => {
        const { circuitInputs } = await genProcessAttestationsCircuitInput(user, epoch, nonce, nonce)

        const { outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof } = await genInputForContract(Circuit.processAttestations, circuitInputs)
        const isProofValid = await unirepContract.verifyProcessAttestationProof( outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof)
        expect(isProofValid).to.be.true

        const tx = await unirepContract.processAttestations(
            outputBlindedUserState, 
            outputBlindedHashChain, 
            inputBlindedUserState, 
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const pfIdx = await unirepContract.getProofIndex(
            computeProcessAttestationsProofHash(
                outputBlindedUserState, 
                outputBlindedHashChain, 
                inputBlindedUserState, 
                proof
            )
        )
        expect(Number(pfIdx)).not.eq(0)
    })

    it('successfully process zero attestations', async () => {
        let zeroSelectors: number[] = []
        for (let i = 0; i < numAttestationsPerProof; i++) {
            zeroSelectors.push(0)
        }
        const { circuitInputs } = await genProcessAttestationsCircuitInput(user, epoch, nonce, nonce, zeroSelectors)
        const { outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof } = await genInputForContract(Circuit.processAttestations, circuitInputs)
        const isProofValid = await unirepContract.verifyProcessAttestationProof( outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof)
        expect(isProofValid).to.be.true

        const tx = await unirepContract.processAttestations(
            outputBlindedUserState, 
            outputBlindedHashChain, 
            inputBlindedUserState, 
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const pfIdx = await unirepContract.getProofIndex(
            computeProcessAttestationsProofHash(
                outputBlindedUserState, 
                outputBlindedHashChain, 
                inputBlindedUserState, 
                proof
            )
        )
        expect(Number(pfIdx)).not.eq(0)
    })
})