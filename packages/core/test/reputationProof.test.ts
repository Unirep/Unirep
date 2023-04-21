// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { EPOCH_LENGTH } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState } from './utils'
import { genEpochKey } from '@unirep/utils'

describe('Reputation proof', function () {
    this.timeout(0)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
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

    it('should generate a zero reputation proof', async () => {
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
        const epoch = await userState.sync.loadCurrentEpoch()
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch }
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        const proveZeroRep = true
        const proof = await userState.genProveReputationProof({
            proveZeroRep,
        })

        const valid = await proof.verify()
        expect(valid).to.be.true
        userState.sync.stop()
    })

    it('should reveal epoch key nonce', async () => {
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
        const epoch = await userState.sync.loadCurrentEpoch()
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch }
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        const epkNonce = 1
        const revealNonce = true
        const proof = await userState.genProveReputationProof({
            epkNonce,
            revealNonce,
        })

        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.nonce).to.equal(epkNonce)
        userState.sync.stop()
    })

    it('should not reveal epoch key nonce', async () => {
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
        const epoch = await userState.sync.loadCurrentEpoch()
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch }
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        const epkNonce = 1
        const revealNonce = false
        const proof = await userState.genProveReputationProof({
            epkNonce,
            revealNonce,
        })

        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.nonce).to.equal('0')
        userState.sync.stop()
    })

    // TODO: should prove minRep, maxRep, graffiti

    it('should prove graffiti', async () => {
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
        const epoch = await userState.sync.loadCurrentEpoch()
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch }
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()

        const graffiti = BigInt(12345)
        const epochKey = genEpochKey(id.secret, attester.address, epoch, 0)
        // const field = userState.sync.settings.sumFieldCount
        const field = 4
        await unirepContract
            .connect(attester)
            .attest(epochKey, epoch, field, graffiti)
            .then((t) => t.wait())

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        const toEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        {
            await userState.waitForSync()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    toEpoch,
                })
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        await userState.waitForSync()
        const proof = await userState.genProveReputationProof({
            graffiti,
        })

        const valid = await proof.verify()
        expect(valid).to.be.true
        expect(proof.graffiti).to.equal(graffiti.toString())
        expect(proof.proveGraffiti).to.equal('1')
        userState.sync.stop()
    })
})
