// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { deployUnirep, deployVerifierHelper } from '@unirep/contracts/deploy'

import { EPOCH_LENGTH, genUserState } from './utils'
import { Circuit } from '@unirep/circuits'

const checkSignals = (signals, proof) => {
    expect(signals.epochKey.toString()).equal(proof.epochKey.toString())
    expect(signals.stateTreeRoot.toString()).equal(
        proof.stateTreeRoot.toString()
    )
    expect(signals.nonce.toString()).equal(proof.nonce.toString())
    expect(signals.epoch.toString()).equal(proof.epoch.toString())
    expect(signals.attesterId.toString()).equal(proof.attesterId.toString())
    expect(signals.revealNonce).equal(Boolean(proof.revealNonce))
    expect(signals.chainId.toString()).equal(proof.chainId.toString())
    expect(signals.data.toString()).equal(proof.data.toString())
}

describe('Epoch key proof', function () {
    this.timeout(0)

    let unirepContract
    let unirepAddress
    let epochKeyVerifierHelper

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        unirepAddress = await unirepContract.getAddress()
        epochKeyVerifierHelper = await deployVerifierHelper(
            unirepAddress,
            accounts[0],
            Circuit.epochKey
        )
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            const accounts = await ethers.getSigners()
            const attester = accounts[1]
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should generate an epoch key proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepAddress,
            id,
            attesterId
        )

        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }

        await userState.waitForSync()
        const proof = await userState.genEpochKeyProof()
        const valid = await proof.verify()
        expect(valid).to.be.true

        const signals = await epochKeyVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })

    it('should reveal the epoch key nonce', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepAddress,
            id,
            attesterId
        )

        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }

        await userState.waitForSync()
        const revealNonce = true
        const nonce = 1
        const proof = await userState.genEpochKeyProof({
            revealNonce,
            nonce,
        })
        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.nonce).to.equal(nonce)

        const signals = await epochKeyVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })

    it('should not reveal the epoch key nonce', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepAddress,
            id,
            attesterId
        )

        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }

        await userState.waitForSync()
        const revealNonce = false
        const nonce = 1
        const proof = await userState.genEpochKeyProof({
            revealNonce,
            nonce,
        })
        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.nonce).to.equal('0')

        const signals = await epochKeyVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })

    it('should prove data', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepAddress,
            id,
            attesterId
        )

        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }

        await userState.waitForSync()
        const data = BigInt(100)
        const proof = await userState.genEpochKeyProof({
            data,
        })
        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.data).to.equal(data.toString())

        const signals = await epochKeyVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })
})
