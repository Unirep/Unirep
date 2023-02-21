// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, genStateTreeLeaf, stringifyBigInts } from '@unirep/utils'
import { EPOCH_LENGTH } from '@unirep/contracts'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Circuit, BuildOrderedTree } from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts/deploy'
import { bootstrapAttestations, bootstrapUsers } from './test'

import { Synchronizer } from '../src'
import { genUserState, compareDB, genUnirepState } from './utils'

let synchronizer: Synchronizer

describe('Synchronizer process events', function () {
    this.timeout(0)
    let unirepContract
    let attester

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

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            synchronizer = await genUnirepState(
                ethers.provider,
                unirepContract.address,
                BigInt(attester.address)
            )
            const epoch = await synchronizer.loadCurrentEpoch()
            await bootstrapUsers(synchronizer, attester)
            await bootstrapAttestations(synchronizer, attester)
            await synchronizer.waitForSync()
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
            const preimages = await synchronizer.genEpochTreePreimages(epoch)
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

            const accounts = await ethers.getSigners()
            await unirepContract
                .connect(accounts[5])
                .sealEpoch(epoch, attester.address, publicSignals, proof)
                .then((t) => t.wait())
        })

        afterEach(async () => {
            await synchronizer.waitForSync()
            const state = await genUserState(
                synchronizer.unirepContract.provider,
                synchronizer.unirepContract.address,
                new ZkIdentity(),
                BigInt(attester.address)
            )
            await compareDB((state.sync as any)._db, (synchronizer as any)._db)
            state.sync.stop()
            synchronizer.stop()

            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

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
        const epoch = await synchronizer.loadCurrentEpoch()
        const { publicSignals, proof } = await userState.genUserSignUpProof({
            epoch,
        })

        await synchronizer.unirepContract
            .connect(attester)
            .userSignUp(publicSignals, proof)
            .then((t) => t.wait())

        const attesterId = BigInt(attester.address).toString()
        await synchronizer.waitForSync()
        const tree = await synchronizer.genStateTree(epoch)
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
            id.secretHash,
            BigInt(attester.address),
            contractEpoch.toNumber(),
            Array(synchronizer.settings.fieldCount).fill(0)
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
        expect(
            await synchronizer.stateTreeRootExists(
                tree.root.toString(),
                Number(epoch)
            )
        ).to.be.true
        userState.sync.stop()
    })

    it('should process attestations', async () => {
        const [Attestation] = synchronizer.unirepContract.filters.Attestation()
            .topics as string[]
        const [EpochTreeLeaf] =
            synchronizer.unirepContract.filters.EpochTreeLeaf()
                .topics as string[]
        const attestationEvent = new Promise((rs, rj) =>
            synchronizer.once(Attestation, (event) => rs(event))
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
        const epoch = await userState.sync.loadCurrentEpoch()
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch }
            )
            await synchronizer.unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        // we're signed up, now run an attestation
        const epochKeys = userState.getEpochKeys(epoch) as bigint[]
        const [epk] = epochKeys
        const fieldIndex = 1
        const val = 138
        // now submit the attestation from the attester
        await synchronizer.unirepContract
            .connect(attester)
            .attest(epk, epoch, fieldIndex, val)
            .then((t) => t.wait())
        await userState.waitForSync()
        // now commit the attetstations
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = await userState.sync.genEpochTreePreimages(epoch)
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
        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const data = await userState.getDataByEpochKey(key, BigInt(epoch))
            if (key.toString() === epk.toString()) {
                expect(data[fieldIndex]).to.equal(val)
                data.forEach((d, i) => {
                    if (i === fieldIndex) return
                    expect(d).to.equal(0)
                })
            } else {
                data.forEach((d) => expect(d).to.equal(0))
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
        userState.sync.stop()
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
        const epoch = await userState.sync.loadCurrentEpoch()
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch }
            )
            await synchronizer.unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        // we're signed up, now run an attestation
        const epochKeys = userState.getEpochKeys(epoch) as bigint[]
        const [epk] = epochKeys
        const fieldIndex = 1
        const val = 18891
        // now submit the attestation from the attester
        const [EpochEnded] = synchronizer.unirepContract.filters.EpochEnded()
            .topics as string[]

        const epochEndedEvent = new Promise((rs, rj) =>
            synchronizer.once(EpochEnded, (event) => rs(event))
        )

        await synchronizer.unirepContract
            .connect(attester)
            .attest(epk, epoch, fieldIndex, val)
            .then((t) => t.wait())

        await userState.waitForSync()

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        // now commit the attetstations
        {
            const preimages = await userState.sync.genEpochTreePreimages(epoch)
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
            await userState.sync.waitForSync()
        }
        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const data = await userState.getDataByEpochKey(key, BigInt(epoch))
            if (key.toString() === epk.toString()) {
                expect(data[fieldIndex]).to.equal(val)
                data.forEach((d, i) => {
                    if (i === fieldIndex) return
                    expect(d).to.equal(0)
                })
            } else {
                data.forEach((d) => expect(d).to.equal(0))
            }
        })
        await Promise.all(checkPromises)

        const [UserStateTransitioned] =
            synchronizer.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        const ust = new Promise((rs, rj) =>
            synchronizer.once(UserStateTransitioned, (event) => rs(event))
        )
        // then run an epoch transition and check the rep
        const toEpoch = await userState.sync.loadCurrentEpoch()
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
            const data = await userState.getData(epoch)
            expect(data[fieldIndex]).to.equal(val)
            data.forEach((d, i) => {
                if (i === fieldIndex) return
                expect(d).to.equal(0)
            })
        }
        userState.sync.stop()
    })
})
