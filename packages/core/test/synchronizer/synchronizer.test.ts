import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { EPOCH_LENGTH } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { deployUnirep } from '@unirep/contracts/deploy'

const attestingFee = ethers.utils.parseEther('0.1')

import { Synchronizer, schema, computeInitUserStateRoot } from '../../src'
import { genUserState, compareDB, submitUSTProofs } from '../utils'
import { SQLiteConnector } from 'anondb/node'

let synchronizer: Synchronizer

describe('Synchronizer process events', function () {
    this.timeout(0)

    before(async () => {
        const accounts = await ethers.getSigners()
        const unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
        const db = await SQLiteConnector.create(schema, ':memory:')
        synchronizer = new Synchronizer(db, defaultProver, unirepContract)
        // now create an attester
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp()
            .then((t) => t.wait())
        await synchronizer.start()
    })

    afterEach(async () => {
        await synchronizer.waitForSync()
        const state = await genUserState(
            synchronizer.unirepContract.provider,
            synchronizer.unirepContract.address,
            new ZkIdentity()
        )
        await compareDB((state as any)._db, (synchronizer as any)._db)
        await state.stop()
    })

    it('should process sign up event', async () => {
        const [UserSignedUp] =
            synchronizer.unirepContract.filters.UserSignedUp()
                .topics as string[]
        const signUpEvent = new Promise((rs, rj) =>
            synchronizer.once(UserSignedUp, (event) => rs(event))
        )
        const userCount = await (synchronizer as any)._db.count(
            'UserSignUp',
            {}
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const epoch = await synchronizer.unirepContract.currentEpoch()
        const attesterId = await synchronizer.unirepContract.attesters(
            accounts[1].address
        )
        const airdropAmount = 20
        const tree = await synchronizer.genGSTree(epoch.toNumber())
        const tx = await synchronizer.unirepContract
            .connect(accounts[1])
            ['userSignUp(uint256,uint256)'](commitment, airdropAmount)
        const receipt = await tx.wait()
        await synchronizer.waitForSync()
        expect(receipt.status, 'User sign up failed').to.equal(1)
        await signUpEvent
        const docs = await (synchronizer as any)._db.findMany('UserSignUp', {
            where: {
                commitment: id.genIdentityCommitment().toString(),
            },
        })
        expect(docs.length).to.equal(1)
        expect(docs[0].epoch).to.equal(epoch.toNumber())
        expect(docs[0].attesterId).to.equal(attesterId.toNumber())
        expect(docs[0].airdrop).to.equal(airdropAmount)
        const finalUserCount = await (synchronizer as any)._db.count(
            'UserSignUp',
            {}
        )
        expect(finalUserCount).to.equal(userCount + 1)
        // now look for a new GSTLeaf
        const leaf = hashLeftRight(
            id.genIdentityCommitment(),
            computeInitUserStateRoot(
                synchronizer.settings.userStateTreeDepth,
                attesterId.toNumber(),
                airdropAmount
            )
        )
        const storedLeaves = await (synchronizer as any)._db.findMany(
            'GSTLeaf',
            {
                where: {
                    hash: leaf.toString(),
                },
            }
        )
        const leafIndex = await (synchronizer as any)._db.count('GSTLeaf', {
            epoch: epoch.toNumber(),
        })
        expect(storedLeaves.length).to.equal(1)
        expect(storedLeaves[0].epoch).to.equal(epoch.toNumber())
        expect(storedLeaves[0].index).to.equal(leafIndex - 1)
        // now look for a new GSTRoot
        tree.insert(leaf)
        expect(
            await synchronizer.GSTRootExists(
                tree.root.toString(),
                epoch.toNumber()
            )
        ).to.be.true
    })

    it('should process epoch transition', async () => {
        await synchronizer.waitForSync()
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])

        const [EpochEnded] = synchronizer.unirepContract.filters.EpochEnded()
            .topics as string[]
        const epochEndedEvent = new Promise((rs, rj) =>
            synchronizer.once(EpochEnded, (event) => rs(event))
        )
        const startEpoch = await synchronizer.unirepContract.currentEpoch()
        expect(startEpoch).to.equal(1)
        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        await epochEndedEvent
        await synchronizer.waitForSync()

        const endEpoch = await synchronizer.unirepContract.currentEpoch()
        const epochs = await (synchronizer as any)._db.findMany('Epoch', {
            where: {},
        })
        expect(endEpoch).to.equal(2)
        expect(epochs.length).to.equal(endEpoch)
        expect(epochs[0].number).to.equal(1)
        expect(epochs[0].sealed).to.equal(1)
        // TODO
        // expect(epochs[0].epochRoot).to.equal(/**/)
        expect(epochs.length).to.equal(endEpoch)
        expect(epochs[1].number).to.equal(2)
        expect(epochs[1].sealed).to.equal(0)
    })

    it('should process ust events', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            ['userSignUp(uint256)'](commitment)
            .then((t) => t.wait())
        expect(receipt.status, 'User sign up failed').to.equal(1)
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())

        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])

        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        await synchronizer.waitForSync()
        const proofs = await userState.genUserStateTransitionProofs()

        const [UserStateTransitioned] =
            synchronizer.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        const ust = new Promise((rs, rj) =>
            synchronizer.once(UserStateTransitioned, (event) => rs(event))
        )
        await submitUSTProofs(synchronizer.unirepContract, proofs)
        await synchronizer.waitForSync()
        await ust
    })
})
