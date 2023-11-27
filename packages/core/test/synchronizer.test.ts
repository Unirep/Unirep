// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { genStateTreeLeaf } from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'
import { bootstrapAttestations, bootstrapUsers } from './test'

import { Synchronizer } from '../src'
import { genUserState, compareDB, genUnirepState, EPOCH_LENGTH } from './utils'

let synchronizer: Synchronizer

describe('Synchronizer process events', function () {
    this.timeout(0)
    let unirepContract
    let unirepAddress
    let attester
    let attesterId
    let chainId

    before(async () => {
        const accounts = await ethers.getSigners()
        attester = accounts[1]
        attesterId = await attester.getAddress()
        unirepContract = await deployUnirep(accounts[0])
        unirepAddress = await unirepContract.getAddress()
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            // now create an attester
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
            synchronizer = await genUnirepState(ethers.provider, unirepAddress)
            const epoch = await synchronizer.loadCurrentEpoch()
            await bootstrapUsers(synchronizer, attester)
            await bootstrapAttestations(synchronizer, attester)
            await synchronizer.waitForSync()
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
        })

        afterEach(async () => {
            await synchronizer.waitForSync()
            const state = await genUserState(
                synchronizer.provider,
                synchronizer.unirepAddress,
                new Identity(),
                BigInt(attesterId)
            )
            await compareDB(state.sync.db, synchronizer.db)
            state.sync.stop()
            synchronizer.stop()

            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

    it('should process attester sign up event', async () => {
        const [AttesterSignedUp] = (await synchronizer.unirepContract.filters
            .AttesterSignedUp()
            .getTopicFilter()) as string[]
        const signUpEvent = new Promise((rs, rj) =>
            synchronizer.once(AttesterSignedUp, (event) => rs(event))
        )
        const attesterCount = await synchronizer.db.count('Attester', {})

        const accounts = await ethers.getSigners()
        const attester = accounts[2]
        const epochLength = 100
        const tx = await synchronizer.unirepContract
            .connect(attester)
            .attesterSignUp(epochLength)

        const transaction = await tx.getTransaction()
        const { timestamp } = await ethers.provider.getBlock(
            transaction?.blockNumber
        )

        await signUpEvent
        const attesterId = await attester.getAddress()
        await synchronizer.waitForSync()
        const docs = await synchronizer.db.findMany('Attester', {
            where: {
                _id: BigInt(attesterId).toString(),
            },
        })
        expect(docs.length).to.equal(1)
        expect(docs[0].epochLength).to.equal(epochLength)
        expect(docs[0].startTimestamp).to.equal(timestamp)
        const finalUserCount = await synchronizer.db.count('Attester', {})
        expect(finalUserCount).to.equal(attesterCount + 1)
    })

    it('should process sign up event', async () => {
        const [UserSignedUp] = (await synchronizer.unirepContract.filters
            .UserSignedUp()
            .getTopicFilter()) as string[]
        const [StateTreeLeaf] = (await synchronizer.unirepContract.filters
            .StateTreeLeaf()
            .getTopicFilter()) as string[]
        const signUpEvent = new Promise((rs, rj) =>
            synchronizer.once(UserSignedUp, (event) => rs(event))
        )
        const stateLeafEvent = new Promise((rs, rj) =>
            synchronizer.once(StateTreeLeaf, (event) => rs(event))
        )
        const userCount = await synchronizer.db.count('UserSignUp', {})
        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepAddress,
            id,
            BigInt(attesterId)
        )
        const epoch = await synchronizer.loadCurrentEpoch()
        const { publicSignals, proof } = await userState.genUserSignUpProof({
            epoch,
        })

        await synchronizer.unirepContract
            .connect(attester)
            .userSignUp(publicSignals, proof)
            .then((t) => t.wait())

        await synchronizer.waitForSync()
        const tree = await synchronizer.genStateTree(epoch)
        await signUpEvent
        await stateLeafEvent
        const docs = await synchronizer.db.findMany('UserSignUp', {
            where: {
                commitment: id.commitment.toString(),
            },
        })
        expect(docs.length).to.equal(1)
        expect(docs[0].epoch).to.equal(epoch)
        expect(docs[0].attesterId).to.equal(BigInt(attesterId).toString())
        const finalUserCount = await synchronizer.db.count('UserSignUp', {})
        expect(finalUserCount).to.equal(userCount + 1)
        // now look for a new GSTLeaf
        const contractEpoch =
            await synchronizer.unirepContract.attesterCurrentEpoch(attesterId)
        const leaf = genStateTreeLeaf(
            id.secret,
            BigInt(attesterId),
            contractEpoch,
            Array(synchronizer.settings.fieldCount).fill(0),
            chainId
        )
        const storedLeaves = await synchronizer.db.findMany('StateTreeLeaf', {
            where: {
                hash: leaf.toString(),
            },
        })
        const leafIndex = await synchronizer.db.count('StateTreeLeaf', {
            epoch: Number(epoch),
        })
        expect(storedLeaves.length).to.equal(1)
        expect(storedLeaves[0].epoch).to.equal(epoch)
        expect(storedLeaves[0].index).to.equal(leafIndex - 1)
        // now look for a new GSTRoot
        expect(
            await synchronizer.stateTreeRootExists(
                tree.root.toString(),
                Number(epoch)
            )
        ).to.be.true
        userState.stop()
    })

    it('should process attestations', async () => {
        const [Attestation] = (await synchronizer.unirepContract.filters
            .Attestation()
            .getTopicFilter()) as string[]
        const [EpochTreeLeaf] = (await synchronizer.unirepContract.filters
            .EpochTreeLeaf()
            .getTopicFilter()) as string[]
        const attestationEvent = new Promise((rs, rj) =>
            synchronizer.once(Attestation, (event) => rs(event))
        )
        const epochTreeLeafEvent = new Promise((rs, rj) =>
            synchronizer.once(EpochTreeLeaf, (event) => rs(event))
        )
        const attestCount = await synchronizer.db.count('Attestation', {})
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const id = new Identity()

        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepAddress,
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

        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const data = await userState.getDataByEpochKey(key, epoch)
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
        const docs = await synchronizer.db.findMany('Attestation', {
            where: {
                epochKey: epk.toString(),
            },
        })
        expect(docs.length).to.equal(1)
        expect(docs[0].epoch).to.equal(epoch)
        expect(docs[0].attesterId).to.equal(BigInt(attesterId).toString())
        const finalAttestCount = await synchronizer.db.count('Attestation', {})
        expect(finalAttestCount).to.equal(attestCount + 1)
        userState.stop()
    })

    it('should process ust events', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const id = new Identity()

        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepAddress,
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
        const [EpochEnded] = (await synchronizer.unirepContract.filters
            .EpochEnded()
            .getTopicFilter()) as string[]

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

        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const data = await userState.getDataByEpochKey(key, epoch)
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
            (await synchronizer.unirepContract.filters
                .UserStateTransitioned()
                .getTopicFilter()) as string[]
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
        userState.stop()
    })
})
