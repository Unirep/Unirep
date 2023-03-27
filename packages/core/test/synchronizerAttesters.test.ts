// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { EPOCH_LENGTH, Unirep } from '@unirep/contracts'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Synchronizer } from '../src/Synchronizer'
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
        const sync = new Synchronizer({
            unirepAddress: unirepContract.address,
            provider: ethers.provider,
            prover: defaultProver,
        })
        const seenAttestations = [] as any
        sync.on('Attestation', ({ decodedData }) => {
            seenAttestations.push(decodedData)
        })
        sync.start()
        await sync.waitForSync()
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
        const sync = new Synchronizer({
            unirepAddress: unirepContract.address,
            provider: ethers.provider,
            prover: defaultProver,
        })
        await sync.start()
        await sync.waitForSync()
        const p = new Promise((r) => sync.on('AttesterSignedUp', r))
        await unirepContract
            .connect(accounts[10])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await p
        sync.stop()
    })

    it('should finish multiple epochs', async () => {
        const accounts = await ethers.getSigners()
        const synchronizer = new Synchronizer({
            unirepAddress: unirepContract.address,
            provider: ethers.provider,
            prover: defaultProver,
        })
        await synchronizer.start()
        for (let x = 0; x < 4; x++) {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
            for (let y = 0; y < ATTESTER_COUNT; y++) {
                const attester = accounts[y]
                await unirepContract
                    .connect(attester)
                    .updateEpochIfNeeded(attester.address)
                    .then((t) => t.wait())
            }
        }
        await synchronizer.waitForSync()
        synchronizer.stop()
    })

    // TODO: test for other events

    it('should sync two and more attesters', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[0]
        const synchronizer = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )

        for (let count = 1; count < ATTESTER_COUNT; count++) {
            await synchronizer.add(accounts[count].address)
            const stateCount = await synchronizer._db.count(
                'SynchronizerState',
                {}
            )
            expect(stateCount).to.equal(count + 1)
        }
    })

    it('should sync before event happens', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[0]
        const attester2 = accounts[1]
        const synchronizer = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )
        await synchronizer.add(attester2.address)

        const id = new ZkIdentity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attester2.address
        )
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester2)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await synchronizer.waitForSync()
        const userCount = await synchronizer._db.count('UserSignUp', {
            attesterId: BigInt(attester2.address).toString(),
            commitment: id.genIdentityCommitment().toString(),
        })
        expect(userCount).to.equal(1)
    })

    it('should sync after event happens', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[0]
        const attester2 = accounts[1]

        const id = new ZkIdentity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attester2.address
        )
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester2)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }

        const synchronizer = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )
        await synchronizer.add(attester2.address)
        await synchronizer.waitForSync()
        console.log(
            await synchronizer._db.findMany('SynchronizerState', { where: {} })
        )
        const userCount = await synchronizer._db.count('UserSignUp', {
            attesterId: BigInt(attester2.address).toString(),
            commitment: id.genIdentityCommitment().toString(),
        })
        expect(userCount).to.equal(1)
    })

    it('should generate proofs for different attester', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[0]
        const attester2 = accounts[1]

        const id = new ZkIdentity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attester.address
        )
        {
            const attesterId = BigInt(attester.address)
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                {
                    attesterId,
                }
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.add(attester2.address)

        {
            const attesterId = BigInt(attester2.address)
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { attesterId }
            )
            await unirepContract
                .connect(attester2)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }

        await userState.waitForSync()

        const fieldIndex = 0
        const change = 10
        // attest
        for (let index = 0; index < 2; index++) {
            const attesterId = BigInt(accounts[index].address)
            const { publicSignals, proof, epochKey, epoch } =
                await userState.genEpochKeyProof({ attesterId })
            await unirepContract
                .verifyEpochKeyProof(publicSignals, proof)
                .then((t) => t.wait())
            await unirepContract
                .connect(accounts[index])
                .attest(epochKey, epoch, fieldIndex, change)
                .then((t) => t.wait())
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        // seal epoch
        await userState.waitForSync()
        for (let index = 0; index < 2; index++) {
            const attesterId = BigInt(accounts[index].address)
            const epoch = BigInt(0)
            const { publicSignals, proof } =
                await userState.sync.genSealedEpochProof({ epoch, attesterId })
            await unirepContract
                .sealEpoch(epoch, attesterId, publicSignals, proof)
                .then((t) => t.wait())
        }

        // ust
        await userState.waitForSync()
        for (let index = 0; index < 2; index++) {
            const toEpoch = 1
            const attesterId = BigInt(accounts[index].address)
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    attesterId,
                    toEpoch,
                })
            await unirepContract
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // get data
        await userState.waitForSync()
        for (let index = 0; index < 2; index++) {
            const attesterId = BigInt(accounts[index].address)
            const data = await userState.getData(undefined, attesterId)
            expect(data[fieldIndex].toString()).to.equal(change.toString())
        }
    })
})
