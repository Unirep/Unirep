// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { EPOCH_LENGTH } from '@unirep/contracts'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Synchronizer } from '../src/Synchronizer'

const ATTESTER_COUNT = 5

describe('Synchronizer watch multiple attesters', function () {
    this.timeout(0)

    let unirepContract

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
                .connect(accounts[0])
                .attest(x, 0, 1, x)
                .then((t) => t.wait())
        }
        const sync = new Synchronizer({
            unirepAddress: unirepContract.address,
            provider: ethers.provider,
            prover: defaultProver,
        })
        const seenAttestations = []
        sync.on('Attestation', ({ decodedData }) => {
            seenAttestations.push(decodedData)
        })
        sync.start()
        await sync.waitForSync()
        expect(seenAttestations.length).to.equal(ATTESTER_COUNT)
        for (let x = 0; x < ATTESTER_COUNT; x++) {
            const { attesterId, epochKey } = seenAttestations[x]
            expect(attesterId.toString()).to.equal(
                BigInt(accounts[0].address).toString()
            )
            expect(epochKey.toString()).to.equal(x.toString())
        }
        await sync.stop()
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
})
