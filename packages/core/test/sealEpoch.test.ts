// @ts-ignore
import { ethers } from 'hardhat'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUnirepState } from './utils'

const EPOCH_LENGTH = 1000

describe('Sealing epoch helper function', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
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

    it('should seal the oldest epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)

        let firstEpoch = 0
        for (let epoch = firstEpoch; epoch < 5; epoch++) {
            await unirepContract
                .connect(attester)
                .attest('0x02', epoch, 1, 1)
                .then((t) => t.wait())
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
        }

        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attesterId
        )
        const { publicSignals, proof } = await unirepState.genSealedEpochProof({
            attesterId,
        })

        await unirepContract
            .connect(accounts[5])
            .sealEpoch(firstEpoch, attester.address, publicSignals, proof)
            .then((t) => t.wait())
    })

    it('should not seal the epoch with no attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        let firstEpoch = 0
        for (let epoch = firstEpoch; epoch < 5; epoch++) {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
        }

        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attesterId
        )
        await new Promise<void>((rs, rj) => {
            unirepState
                .genSealedEpochProof({
                    attesterId,
                })
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should not seal the epoch if epoch is already sealed', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)

        const epoch = 0
        await unirepContract
            .connect(attester)
            .attest('0x02', epoch, 1, 1)
            .then((t) => t.wait())
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attesterId
        )
        const { publicSignals, proof } = await unirepState.genSealedEpochProof({
            attesterId,
        })

        await unirepContract
            .connect(accounts[5])
            .sealEpoch(epoch, attester.address, publicSignals, proof)
            .then((t) => t.wait())

        await unirepState.waitForSync()
        await new Promise<void>((rs, rj) => {
            unirepState
                .genSealedEpochProof({
                    attesterId,
                })
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
