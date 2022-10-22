// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { EPOCH_LENGTH } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState } from './utils'

describe('User state', function () {
    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    it('attester sign up', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    it('user sign up proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )

        const { publicSignals, proof } = await userState.genUserSignUpProof()
        const r = await unirepContract
            .connect(attester)
            .userSignUp(publicSignals, proof)
            .then((t) => t.wait())
        expect(r.status).equal(1)
        await userState.stop()
    })

    it('epoch key proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()
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
        const { publicSignals, proof } = await userState.genVerifyEpochKeyProof(
            0
        )
        const valid = await unirepContract.verifyEpochKeyProof(
            publicSignals,
            proof
        )
        expect(valid).to.be.true
        await userState.stop()
    })

    it('aggregate epoch key proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()
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
        const { epochKey } = await userState.genVerifyEpochKeyProof(0)

        const epoch = await userState.getUnirepStateCurrentEpoch()
        const newPosRep = 10
        const newNegRep = 5
        // now submit the attestation from the attester
        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, newPosRep, newNegRep, {})
            .then((t) => t.wait())
        await userState.waitForSync()
        // now commit the attetstations
        await unirepContract
            .connect(accounts[5])
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            0
        )
        const { publicSignals, proof } =
            await userState.genAggregateEpochKeysProof(
                hashchain.epochKeys,
                hashchain.epochKeyBalances,
                hashchain.index,
                epoch
            )
        await unirepContract
            .connect(accounts[5])
            .processHashchain(publicSignals, proof)
            .then((t) => t.wait())
        await userState.stop()
    })

    it('ust proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()
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
        const oldEpoch = await userState.latestTransitionedEpoch()
        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        {
            await userState.waitForSync()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof()
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        const newEpoch = await userState.latestTransitionedEpoch()
        expect(newEpoch).equal(oldEpoch + 1)
        await userState.stop()
    })

    it('reputation proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()
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
        // we're signed up, now run an attestation
        const epoch = await userState.getUnirepStateCurrentEpoch()
        const epochKeys = await userState.getEpochKeys(epoch)
        const [epk] = epochKeys
        const newPosRep = 10
        const newNegRep = 5
        // now submit the attestation from the attester
        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epk, newPosRep, newNegRep, {})
            .then((t) => t.wait())
        await userState.waitForSync()
        // now commit the attetstations
        await unirepContract
            .connect(accounts[5])
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            0
        )
        {
            const { publicSignals, proof } =
                await userState.genAggregateEpochKeysProof(
                    hashchain.epochKeys,
                    hashchain.epochKeyBalances,
                    hashchain.index,
                    epoch
                )
            await unirepContract
                .connect(accounts[5])
                .processHashchain(publicSignals, proof)
                .then((t) => t.wait())
            await userState.waitForSync()
        }

        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const { posRep, negRep } = await userState.getRepByEpochKey(
                key,
                BigInt(epoch)
            )
            if (key.toString() === epk.toString()) {
                expect(posRep).to.equal(newPosRep)
                expect(negRep).to.equal(newNegRep)
            } else {
                expect(posRep).to.equal(0)
                expect(negRep).to.equal(0)
            }
        })
        await Promise.all(checkPromises)
        // then run an epoch transition and check the rep
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        {
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof()
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        {
            const { posRep, negRep } = await userState.getRepByAttester()
            expect(posRep).to.equal(newPosRep)
            expect(negRep).to.equal(newNegRep)
        }

        await userState.waitForSync()
        const { publicSignals, proof } =
            await userState.genProveReputationProof(0, 1)
        const valid = await unirepContract.verifyReputationProof(
            publicSignals,
            proof
        )
        expect(valid).to.be.true
        await userState.stop()
    })
})
