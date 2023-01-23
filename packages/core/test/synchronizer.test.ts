// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, genStateTreeLeaf } from '@unirep/utils'
import { EPOCH_LENGTH } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
import {
    bootstrapAttestations,
    bootstrapUsers,
    processAttestations,
} from '@unirep/test'

import { Synchronizer } from '../src'
import { genUserState, compareDB, genUnirepState } from './utils'

let synchronizer: Synchronizer

describe('Synchronizer process events', function () {
    this.timeout(0)
    let unirepContract
    let attester
    let snapshot

    before(async () => {
        const accounts = await ethers.getSigners()
        attester = accounts[1]
        unirepContract = await deployUnirep(accounts[0])
        // now create an attester
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
        synchronizer = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            BigInt(attester.address)
        )
        const epochTree = await synchronizer.genEpochTree(epoch)
        await processAttestations(attester, epoch, unirepContract, {
            epochTree,
        })
    })

    afterEach(async () => {
        await synchronizer.waitForSync()
        const state = await genUserState(
            synchronizer.unirepContract.provider,
            synchronizer.unirepContract.address,
            new ZkIdentity(),
            BigInt(attester.address)
        )
        await compareDB((state as any)._db, (synchronizer as any)._db)
        await state.stop()
        await synchronizer.stop()

        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should process sign up event', async () => {
        const [UserSignedUp] =
            synchronizer.unirepContract.filters.UserSignedUp()
                .topics as string[]
        const [StateTreeLeaf] =
            synchronizer.unirepContract.filters.StateTreeLeaf()
                .topics as string[]
        const signUpEvent = new Promise((rs, rj) =>
            synchronizer.once(UserSignedUp, (event) => rs(event))
        )
        const stateLeafEvent = new Promise((rs, rj) =>
            synchronizer.once(StateTreeLeaf, (event) => rs(event))
        )
        const userCount = await (synchronizer as any)._db.count(
            'UserSignUp',
            {}
        )
        const id = new ZkIdentity()
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id,
            BigInt(attester.address)
        )
        const { publicSignals, proof } = await userState.genUserSignUpProof()

        const tx = await synchronizer.unirepContract
            .connect(attester)
            .userSignUp(publicSignals, proof)
            .then((t) => t.wait())

        const epoch = await synchronizer.loadCurrentEpoch()
        const attesterId = BigInt(attester.address).toString()
        const tree = await synchronizer.genStateTree(epoch)
        await synchronizer.waitForSync()
        await signUpEvent
        await stateLeafEvent
        const docs = await (synchronizer as any)._db.findMany('UserSignUp', {
            where: {
                commitment: id.genIdentityCommitment().toString(),
            },
        })
        expect(docs.length).to.equal(1)
        expect(docs[0].epoch).to.equal(Number(epoch))
        expect(docs[0].attesterId).to.equal(attesterId)
        const finalUserCount = await (synchronizer as any)._db.count(
            'UserSignUp',
            {}
        )
        expect(finalUserCount).to.equal(userCount + 1)
        // now look for a new GSTLeaf
        const contractEpoch =
            await synchronizer.unirepContract.attesterCurrentEpoch(
                attester.address
            )
        const leaf = genStateTreeLeaf(
            id.identityNullifier,
            BigInt(attester.address),
            contractEpoch.toNumber(),
            0,
            0,
            0,
            0
        )
        const storedLeaves = await (synchronizer as any)._db.findMany(
            'StateTreeLeaf',
            {
                where: {
                    hash: leaf.toString(),
                },
            }
        )
        const leafIndex = await (synchronizer as any)._db.count(
            'StateTreeLeaf',
            {
                epoch: Number(epoch),
            }
        )
        expect(storedLeaves.length).to.equal(1)
        expect(storedLeaves[0].epoch).to.equal(Number(epoch))
        expect(storedLeaves[0].index).to.equal(leafIndex - 1)
        // now look for a new GSTRoot
        tree.insert(leaf)
        expect(
            await synchronizer.stateTreeRootExists(
                tree.root.toString(),
                Number(epoch)
            )
        ).to.be.true
        await userState.stop()
    })

    it('should process attestations', async () => {
        const [AttestationSubmitted] =
            synchronizer.unirepContract.filters.AttestationSubmitted()
                .topics as string[]
        const [EpochTreeLeaf] =
            synchronizer.unirepContract.filters.EpochTreeLeaf()
                .topics as string[]
        const attestationEvent = new Promise((rs, rj) =>
            synchronizer.once(AttestationSubmitted, (event) => rs(event))
        )
        const epochTreeLeafEvent = new Promise((rs, rj) =>
            synchronizer.once(EpochTreeLeaf, (event) => rs(event))
        )
        const attestCount = await (synchronizer as any)._db.count(
            'Attestation',
            {}
        )
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()

        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id,
            attesterId
        )
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await synchronizer.unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        // we're signed up, now run an attestation
        const epoch = await userState.loadCurrentEpoch()
        const epochKeys = await userState.getEpochKeys(epoch)
        const [epk] = epochKeys
        const newPosRep = 10
        const newNegRep = 5
        const newGraffiti = 1294194
        // now submit the attestation from the attester
        await synchronizer.unirepContract
            .connect(attester)
            .submitAttestation(epoch, epk, newPosRep, newNegRep, newGraffiti)
            .then((t) => t.wait())
        await userState.waitForSync()
        // now commit the attetstations
        await synchronizer.unirepContract
            .connect(accounts[5])
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        const hashchain = await synchronizer.unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        const { publicSignals, proof } =
            await userState.genAggregateEpochKeysProof({
                epochKeys: hashchain.epochKeys,
                newBalances: hashchain.epochKeyBalances,
                hashchainIndex: hashchain.index,
                epoch,
            })
        await synchronizer.unirepContract
            .connect(accounts[5])
            .processHashchain(publicSignals, proof)
            .then((t) => t.wait())
        await userState.waitForSync()
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
        await synchronizer.waitForSync()
        await attestationEvent
        await epochTreeLeafEvent
        const docs = await (synchronizer as any)._db.findMany('Attestation', {
            where: {
                epochKey: epk.toString(),
            },
        })
        expect(docs.length).to.equal(1)
        expect(docs[0].epoch).to.equal(Number(epoch))
        expect(docs[0].attesterId).to.equal(attesterId.toString())
        const finalAttestCount = await (synchronizer as any)._db.count(
            'Attestation',
            {}
        )
        expect(finalAttestCount).to.equal(attestCount + 1)
        await userState.stop()
    })

    it('should process ust events', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()

        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id,
            attesterId
        )
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await synchronizer.unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        // we're signed up, now run an attestation
        const epoch = await userState.loadCurrentEpoch()
        const epochKeys = await userState.getEpochKeys(epoch)
        const [epk] = epochKeys
        const newPosRep = 10
        const newNegRep = 5
        const newGraffiti = 1294194
        // now submit the attestation from the attester
        await synchronizer.unirepContract
            .connect(attester)
            .submitAttestation(epoch, epk, newPosRep, newNegRep, newGraffiti)
            .then((t) => t.wait())
        await userState.waitForSync()
        // now commit the attetstations
        await synchronizer.unirepContract
            .connect(accounts[5])
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        const hashchain = await synchronizer.unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        const { publicSignals, proof } =
            await userState.genAggregateEpochKeysProof({
                epochKeys: hashchain.epochKeys,
                newBalances: hashchain.epochKeyBalances,
                hashchainIndex: hashchain.index,
                epoch,
            })
        await synchronizer.unirepContract
            .connect(accounts[5])
            .processHashchain(publicSignals, proof)
            .then((t) => t.wait())
        await userState.waitForSync()
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

        const [EpochEnded] = synchronizer.unirepContract.filters.EpochEnded()
            .topics as string[]
        const [UserStateTransitioned] =
            synchronizer.unirepContract.filters.UserStateTransitioned()
                .topics as string[]

        const epochEndedEvent = new Promise((rs, rj) =>
            synchronizer.once(EpochEnded, (event) => rs(event))
        )
        const ust = new Promise((rs, rj) =>
            synchronizer.once(UserStateTransitioned, (event) => rs(event))
        )
        // then run an epoch transition and check the rep
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const toEpoch = await userState.loadCurrentEpoch()
        {
            await userState.waitForSync()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    toEpoch,
                })
            // submit it
            await synchronizer.unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }
        await synchronizer.waitForSync()
        await ust
        await epochEndedEvent

        {
            const { posRep, negRep, graffiti } = await userState.getRep()
            expect(posRep).to.equal(newPosRep)
            expect(negRep).to.equal(newNegRep)
            expect(graffiti).to.equal(newGraffiti)
        }
        await userState.stop()
    })
})
