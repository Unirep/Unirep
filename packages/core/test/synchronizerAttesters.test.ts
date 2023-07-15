// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Unirep } from '@unirep/contracts'
import { deployUnirep, deployVerifierHelper } from '@unirep/contracts/deploy'
import { EPOCH_LENGTH, genUnirepState, genUserState } from './utils'
import { Identity } from '@semaphore-protocol/identity'
import { schema } from '../src/schema'
import { SQLiteConnector } from 'anondb/node'
import { Circuit } from '@unirep/circuits'

const ATTESTER_COUNT = 5

describe('Synchronizer watch multiple attesters', function () {
    this.timeout(0)

    let unirepContract: Unirep
    let epkVerifierHelper

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        epkVerifierHelper = await deployVerifierHelper(
            accounts[0],
            Circuit.epochKey
        )
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            const accounts = await ethers.getSigners()
            for (let x = 0; x < ATTESTER_COUNT; x++) {
                const attester = accounts[x]
                await unirepContract
                    .connect(attester)
                    .attesterSignUp(EPOCH_LENGTH)
                    .then((t) => t.wait())
            }
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should load attestations from all', async () => {
        const accounts = await ethers.getSigners()
        for (let x = 0; x < ATTESTER_COUNT; x++) {
            await unirepContract
                .connect(accounts[x])
                .attest(x + 2, 0, 1, x + 1)
                .then((t) => t.wait())
        }
        const sync = await genUnirepState(
            ethers.provider,
            unirepContract.address
        )

        const seenAttestations = await sync.db.findMany('Attestation', {
            where: {},
        })
        expect(seenAttestations.length).to.equal(ATTESTER_COUNT)
        for (let x = 0; x < ATTESTER_COUNT; x++) {
            const { attesterId, epochKey } = seenAttestations[x]
            expect(attesterId.toString()).to.equal(
                BigInt(accounts[x].address).toString()
            )
            expect(epochKey.toString()).to.equal((x + 2).toString())
        }
        sync.stop()
    })

    it('should catch attester sign up event', async () => {
        const accounts = await ethers.getSigners()
        const sync = await genUnirepState(
            ethers.provider,
            unirepContract.address
        )
        const p = new Promise((r) => sync.on('AttesterSignedUp', r))
        await unirepContract
            .connect(accounts[10])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await p
        sync.stop()
    })

    it('should access attesters epochs', async () => {
        const accounts = await ethers.getSigners()
        const sync = await genUnirepState(
            ethers.provider,
            unirepContract.address
        )
        for (let i = 0; i < ATTESTER_COUNT; i++) {
            expect(sync.calcCurrentEpoch(accounts[i].address)).to.equal(0)
        }
        // should not access epoch if attester is not signed up
        expect(() =>
            sync.calcCurrentEpoch(accounts[ATTESTER_COUNT].address)
        ).to.throw('is not synchronized')
    })

    it('should access attesters epochs after syn starts', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[ATTESTER_COUNT]
        const sync = await genUnirepState(
            ethers.provider,
            unirepContract.address
        )
        expect(() => sync.calcCurrentEpoch(attester.address)).to.throw(
            'is not synchronized'
        )
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await sync.waitForSync()
        expect(sync.calcCurrentEpoch(attester.address)).to.equal(0)
    })

    it('should finish multiple epochs', async () => {
        const accounts = await ethers.getSigners()
        const synchronizer = await genUnirepState(
            ethers.provider,
            unirepContract.address
        )
        for (let x = 0; x < 4; x++) {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
            for (let y = 0; y < ATTESTER_COUNT; y++) {
                const attester = accounts[y]
                await unirepContract
                    .connect(attester)
                    .updateEpochIfNeeded(attester.address)
                    .then((t) => t.wait())
                await synchronizer.waitForSync()
                const epoch = await synchronizer.loadCurrentEpoch(
                    attester.address
                )
                expect(epoch).to.equal(x + 1)
            }
        }
        synchronizer.stop()
    })

    // TODO: test for other events

    it('should sync two and more attesters', async () => {
        const accounts = await ethers.getSigners()
        const count = 2
        const attesters = accounts.slice(0, count).map((a) => a.address)
        const synchronizer = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attesters
        )

        for (let i = 0; i < count; i++) {
            const epoch = await synchronizer.readCurrentEpoch(attesters[i])
            expect(epoch).not.equal(null)
        }
        synchronizer.stop()
    })

    it('should sync before event happens', async () => {
        const accounts = await ethers.getSigners()
        const count = 2
        const attesters = accounts.slice(0, count).map((a) => a.address)

        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesters
        )

        for (let i = 0; i < count; i++) {
            const attesterId = BigInt(accounts[i].address)
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                {
                    attesterId,
                }
            )
            await unirepContract
                .connect(accounts[i])
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            await userState.waitForSync()
            const userCount = await userState.sync.db.count('UserSignUp', {
                attesterId: BigInt(accounts[i].address).toString(),
                commitment: id.commitment.toString(),
            })
            expect(userCount).to.equal(1)
        }
        userState.sync.stop()
    })

    it('should sync after event happens', async () => {
        const accounts = await ethers.getSigners()
        const count = 2
        const attesters = accounts.slice(0, count).map((a) => a.address)

        const id = new Identity()
        {
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attesters
            )
            for (let i = 0; i < count; i++) {
                const attesterId = BigInt(accounts[i].address)
                const { publicSignals, proof } =
                    await userState.genUserSignUpProof({
                        attesterId,
                    })
                await unirepContract
                    .connect(accounts[i])
                    .userSignUp(publicSignals, proof)
                    .then((t) => t.wait())
            }
            userState.sync.stop()
        }

        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesters
        )
        const userCount = await userState.sync.db.count('UserSignUp', {
            attesterId: BigInt(accounts[0].address).toString(),
            commitment: id.commitment.toString(),
        })
        expect(userCount).to.equal(1)
        userState.sync.stop()
    })

    it('should stop and sync with different attesters', async () => {
        const accounts = await ethers.getSigners()

        const attesters = Array(ATTESTER_COUNT)
            .fill(0)
            .map((_, i) => accounts[i])

        const ids = [] as any[]
        for (const attester of attesters) {
            const id = new Identity()
            ids.push(id)
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attester.address
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            userState.stop()
        }

        const db = await SQLiteConnector.create(schema, ':memory:')
        {
            const state = await genUnirepState(
                ethers.provider,
                unirepContract.address,
                attesters[0].address,
                db
            )
            await state.start()
            await state.waitForSync()
            state.stop()
        }
        {
            const state = await genUnirepState(
                ethers.provider,
                unirepContract.address,
                attesters.map((a) => a.address),
                db
            )
            await state.start()
            await state.waitForSync()
            state.stop()
        }
        for (const id of ids) {
            const count = await db.count('UserSignUp', {
                commitment: id.commitment.toString(),
            })
            expect(count).to.equal(1)
        }
    })

    it('should generate proofs for different attester', async () => {
        const accounts = await ethers.getSigners()
        const count = 2
        const attesters = accounts.slice(0, count).map((a) => a.address)

        const id = new Identity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesters
        )

        for (let i = 0; i < count; i++) {
            const attesterId = BigInt(accounts[i].address)
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                {
                    attesterId,
                }
            )
            await unirepContract
                .connect(accounts[i])
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            await userState.waitForSync()
            const userCount = await userState.sync.db.count('UserSignUp', {
                attesterId: BigInt(accounts[i].address).toString(),
                commitment: id.commitment.toString(),
            })
            expect(userCount).to.equal(1)
        }

        const index = 0
        const change = 10
        // attest
        for (let i = 0; i < count; i++) {
            const attesterId = BigInt(accounts[i].address).toString()
            const { publicSignals, proof, epochKey, epoch } =
                await userState.genEpochKeyProof({ attesterId })
            await epkVerifierHelper.verifyAndCheck(publicSignals, proof)
            await unirepContract
                .connect(accounts[i])
                .attest(epochKey, epoch, index, change)
                .then((t) => t.wait())
            await userState.waitForSync()
            const userCount = await userState.sync.db.count('Attestation', {
                attesterId,
                epochKey: epochKey.toString(),
            })
            expect(userCount).to.equal(1)
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        // ust
        await userState.waitForSync()
        for (let i = 0; i < 2; i++) {
            const toEpoch = 1
            const attesterId = BigInt(accounts[i].address).toString()
            const { publicSignals, proof, epochKeys, historyTreeRoot } =
                await userState.genUserStateTransitionProof({
                    attesterId,
                    toEpoch,
                })
            await unirepContract
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
            await userState.waitForSync()
            const userCount = await userState.sync.db.count('Nullifier', {
                attesterId,
                nullifier: epochKeys[0].toString(),
            })
            expect(userCount).to.equal(1)
            const historyTree = await userState.sync.genHistoryTree(attesterId)
            expect(historyTree.root.toString()).to.equal(
                historyTreeRoot.toString()
            )
        }

        // get data
        await userState.waitForSync()
        for (let i = 0; i < count; i++) {
            const attesterId = BigInt(accounts[i].address)
            const data = await userState.getData(undefined, attesterId)
            expect(data[index].toString()).to.equal(change.toString())
        }

        // gen rep proof
        for (let i = 0; i < count; i++) {
            const attesterId = BigInt(accounts[i].address)
            const proof = await userState.genProveReputationProof({
                attesterId,
            })
            const valid = await proof.verify()
            expect(valid).to.be.true
        }
        userState.sync.stop()
    })
})
