// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, stringifyBigInts } from '@unirep/utils'
import { EPOCH_LENGTH } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Circuit, BuildOrderedTree } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { genUnirepState, genUserState } from './utils'
import {
    bootstrapAttestations,
    bootstrapUsers,
    processAttestations,
} from '@unirep/test'

describe('User state', function () {
    this.timeout(0)
    let unirepContract
    let snapshot

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    beforeEach(async () => {
        snapshot = await ethers.provider.send('evm_snapshot', [])
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await bootstrapUsers(attester, unirepContract, {
            epoch: epoch.toNumber(),
        })
        await bootstrapAttestations(attester, epoch.toNumber(), unirepContract)
        const synchronizer = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            BigInt(attester.address)
        )
        const epochTree = await synchronizer.genEpochTree(epoch)
        await processAttestations(attester, epoch, unirepContract, {
            epochTree,
        })
        await synchronizer.stop()
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
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
        const proof = await userState.genEpochKeyProof()
        const valid = await proof.verify()
        expect(valid).to.be.true
        await userState.stop()
    })

    it.skip('ust proof', async () => {
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
            const toEpoch = await userState.loadCurrentEpoch()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
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

    it.skip('reputation proof', async () => {
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
        const epoch = await userState.loadCurrentEpoch()
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
        // we're signed up, now run an attestation
        const epochKeys = await userState.getEpochKeys(epoch)
        const [epk] = epochKeys
        const newPosRep = 10
        const newNegRep = 5
        const newGraffiti = 1294194
        // now submit the attestation from the attester
        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epk, newPosRep, newNegRep, newGraffiti)
            .then((t) => t.wait())
        await userState.waitForSync()
        // now commit the attetstations

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        {
            const preimages = await userState.genEpochTreePreimages(epoch)
            const { circuitInputs } =
                BuildOrderedTree.buildInputsForLeaves(preimages)
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.buildOrderedTree,
                stringifyBigInts(circuitInputs)
            )
            const { publicSignals, proof } = new BuildOrderedTree(
                r.publicSignals,
                r.proof,
                defaultProver
            )

            await unirepContract
                .connect(accounts[5])
                .sealEpoch(epoch, attester.address, publicSignals, proof)
                .then((t) => t.wait())
            await userState.waitForSync()
        }

        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const { posRep, negRep, graffiti } =
                await userState.getRepByEpochKey(key, BigInt(epoch))
            if (key.toString() === epk.toString()) {
                expect(posRep).to.equal(newPosRep)
                expect(negRep).to.equal(newNegRep)
                expect(graffiti).to.equal(newGraffiti)
            } else {
                expect(posRep).to.equal(0)
                expect(negRep).to.equal(0)
                expect(graffiti).to.equal(0)
            }
        })
        await Promise.all(checkPromises)
        // then run an epoch transition and check the rep
        {
            await userState.waitForSync()
            const toEpoch = await userState.loadCurrentEpoch()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        {
            const currentEpoch = await userState.loadCurrentEpoch()
            const { posRep, negRep, graffiti } = await userState.getRep(
                Number(currentEpoch)
            )
            expect(posRep).to.equal(newPosRep)
            expect(negRep).to.equal(newNegRep)
            expect(graffiti).to.equal(newGraffiti)
        }

        await userState.waitForSync()
        const proof = await userState.genProveReputationProof({
            epkNonce: 0,
            minRep: 1,
        })

        const valid = await proof.verify()
        expect(valid).to.be.true
        await userState.stop()
    })
})
