// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import {
    deploy,
    genInputForContract,
    keccak256Hash,
    genProcessAttestationsCircuitInput,
} from './utils'
import { Unirep } from '../src'
import { config } from './testConfig'
import { CircuitName } from '../../circuits/src'

describe('Process attestation circuit', function () {
    this.timeout(300000)

    let accounts: ethers.Signer[]
    let unirepContract: Unirep

    const epoch = BigInt(1)
    const nonce = BigInt(0)
    const user = new ZkIdentity()

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], config)
    })

    it('successfully process attestations', async () => {
        const { circuitInputs } = await genProcessAttestationsCircuitInput(
            user,
            epoch,
            nonce,
            nonce
        )

        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = await genInputForContract(
            CircuitName.processAttestations,
            circuitInputs
        )
        const isProofValid = await unirepContract.verifyProcessAttestationProof(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        )
        expect(isProofValid).to.be.true

        const tx = await unirepContract.processAttestations(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const input: Object = {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        }
        const pfIdx = await unirepContract.getProofIndex(
            keccak256Hash(CircuitName.processAttestations, input)
        )
        expect(Number(pfIdx)).not.eq(0)
    })

    it('successfully process zero attestations', async () => {
        let zeroSelectors: number[] = []
        for (let i = 0; i < config.numAttestationsPerProof; i++) {
            zeroSelectors.push(0)
        }
        const { circuitInputs } = await genProcessAttestationsCircuitInput(
            user,
            epoch,
            nonce,
            nonce,
            zeroSelectors
        )
        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = await genInputForContract(
            CircuitName.processAttestations,
            circuitInputs
        )
        const isProofValid = await unirepContract.verifyProcessAttestationProof(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        )
        expect(isProofValid).to.be.true

        const tx = await unirepContract.processAttestations(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const input = {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        }
        const pfIdx = await unirepContract.getProofIndex(
            keccak256Hash(CircuitName.processAttestations, input)
        )
        expect(Number(pfIdx)).not.eq(0)
    })
})
