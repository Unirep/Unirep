// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { deployUnirep, deployVerifierHelper } from '@unirep/contracts/deploy'

import { EPOCH_LENGTH, genUserState } from './utils'
import { Circuit } from '@unirep/circuits'

const checkSignals = (signals, proof) => {
    expect(signals.epochKey.toString()).equal(proof.epochKey.toString())
    expect(signals.nonce.toString()).equal(proof.nonce.toString())
    expect(signals.epoch.toString()).equal(proof.epoch.toString())
    expect(signals.attesterId.toString()).equal(proof.attesterId.toString())
    expect(signals.revealNonce).equal(Boolean(proof.revealNonce))
    expect(signals.chainId.toString()).equal(proof.chainId.toString())
    expect(signals.data.toString()).equal(proof.data.toString())
}

describe('Epoch key Lite proof', function () {
    this.timeout(0)

    let unirepContract
    let epochKeyLiteVerifierHelper

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        epochKeyLiteVerifierHelper = await deployVerifierHelper(
            unirepContract.address,
            accounts[0],
            Circuit.epochKeyLite
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

    it('should generate an epoch key lite proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
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
        const proof = await userState.genEpochKeyLiteProof()
        const valid = await proof.verify()
        expect(valid).to.be.true

        const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })

    it('should reveal the epoch key nonce', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
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
        const proof = await userState.genEpochKeyLiteProof({
            revealNonce,
            nonce,
        })
        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.nonce).to.equal(nonce)

        const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })

    it('should not reveal the epoch key nonce', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
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
        const proof = await userState.genEpochKeyLiteProof({
            revealNonce,
            nonce,
        })
        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.nonce).to.equal('0')

        const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })

    it('should prove data', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
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
        const proof = await userState.genEpochKeyLiteProof({
            data,
        })
        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.data).to.equal(data.toString())

        const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })

    it('should specify an epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
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
        // epoch transition
        const epoch = 100
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH * epoch])
        await ethers.provider.send('evm_mine', [])
        const proof = await userState.genEpochKeyLiteProof({
            epoch,
        })
        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.epoch).to.equal(epoch.toString())

        const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
            proof.publicSignals,
            proof.proof
        )
        checkSignals(signals, proof)
        userState.stop()
    })
})
