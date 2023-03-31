// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { EPOCH_LENGTH, Unirep } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
import { genUnirepState, genUserState } from './utils'
import { ZkIdentity } from '@unirep/utils'

const ATTESTER_COUNT = 5

describe('Synchronizer watch multiple attesters', function () {
    this.timeout(0)

    let unirepContract: Unirep

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        for (let x = 0; x < ATTESTER_COUNT; x++) {
            const attester = accounts[x]
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        }
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(async () => {
            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

    it('should load attestations from all', async () => {
        const accounts = await ethers.getSigners()
        for (let x = 0; x < ATTESTER_COUNT; x++) {
            await unirepContract
                .connect(accounts[x])
                .attest(x, 0, 1, x)
                .then((t) => t.wait())
        }
        const sync = await genUnirepState(
            ethers.provider,
            unirepContract.address
        )

        const seenAttestations = await sync._db.findMany('Attestation', {
            where: {},
        })
        expect(seenAttestations.length).to.equal(ATTESTER_COUNT)
        for (let x = 0; x < ATTESTER_COUNT; x++) {
            const { attesterId, epochKey } = seenAttestations[x]
            expect(attesterId.toString()).to.equal(
                BigInt(accounts[x].address).toString()
            )
            expect(epochKey.toString()).to.equal(x.toString())
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

        const id = new ZkIdentity()
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
            const userCount = await userState.sync._db.count('UserSignUp', {
                attesterId: BigInt(accounts[i].address).toString(),
                commitment: id.genIdentityCommitment().toString(),
            })
            expect(userCount).to.equal(1)
        }
        userState.sync.stop()
    })

    it('should sync after event happens', async () => {
        const accounts = await ethers.getSigners()
        const count = 2
        const attesters = accounts.slice(0, count).map((a) => a.address)

        const id = new ZkIdentity()
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
        const userCount = await userState.sync._db.count('UserSignUp', {
            attesterId: BigInt(accounts[0].address).toString(),
            commitment: id.genIdentityCommitment().toString(),
        })
        expect(userCount).to.equal(1)
        userState.sync.stop()
    })

    it('should generate proofs for different attester', async () => {
        const accounts = await ethers.getSigners()
        const count = 2
        const attesters = accounts.slice(0, count).map((a) => a.address)

        const id = new ZkIdentity()
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
            const userCount = await userState.sync._db.count('UserSignUp', {
                attesterId: BigInt(accounts[i].address).toString(),
                commitment: id.genIdentityCommitment().toString(),
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
            await unirepContract
                .verifyEpochKeyProof(publicSignals, proof)
                .then((t) => t.wait())
            await unirepContract
                .connect(accounts[i])
                .attest(epochKey, epoch, index, change)
                .then((t) => t.wait())
            await userState.waitForSync()
            const userCount = await userState.sync._db.count('Attestation', {
                attesterId,
                epochKey: epochKey.toString(),
            })
            expect(userCount).to.equal(1)
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        // seal epoch
        await userState.waitForSync()
        for (let i = 0; i < count; i++) {
            const attesterId = BigInt(accounts[i].address)
            const epoch = BigInt(0)
            const { publicSignals, proof } =
                await userState.sync.genSealedEpochProof({ epoch, attesterId })
            await unirepContract
                .sealEpoch(epoch, attesterId, publicSignals, proof)
                .then((t) => t.wait())
        }

        // ust
        await userState.waitForSync()
        for (let i = 0; i < 2; i++) {
            const toEpoch = 1
            const attesterId = BigInt(accounts[i].address).toString()
            const { publicSignals, proof, transitionNullifier } =
                await userState.genUserStateTransitionProof({
                    attesterId,
                    toEpoch,
                })
            await unirepContract
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
            await userState.waitForSync()
            const userCount = await userState.sync._db.count('Nullifier', {
                attesterId,
                nullifier: transitionNullifier.toString(),
            })
            expect(userCount).to.equal(1)
        }

        // get data
        await userState.waitForSync()
        for (let i = 0; i < count; i++) {
            const attesterId = BigInt(accounts[i].address)
            const data = await userState.getData(undefined, attesterId)
            expect(data[index].toString()).to.equal(change.toString())
        }
        userState.sync.stop()
    })
})
