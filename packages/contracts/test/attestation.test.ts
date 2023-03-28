// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { SNARK_SCALAR_FIELD } from '@unirep/circuits'
import { F, hash1, genEpochTreeLeaf } from '@unirep/utils'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import defaultConfig from '@unirep/circuits/config'

const { FIELD_COUNT, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, SUM_FIELD_COUNT } =
    defaultConfig

describe('Attestations', function () {
    this.timeout(120000)
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
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should fail to attest to out of range field', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await expect(
            unirepContract
                .connect(attester)
                .attest(190124, epoch, FIELD_COUNT, 1)
                .then((t) => t.wait())
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidField')
    })

    it('should fail to attest to timestamp field', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await expect(
            unirepContract
                .connect(attester)
                .attest(190124, epoch, SUM_FIELD_COUNT + 1, 1)
                .then((t) => t.wait())
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidField')
    })

    it('should overflow in field', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const fieldIndex = 0
        const a1 = hash1([1])
        const a2 = F - BigInt(1)
        const result = (a1 + a2) % F
        const data = [result, ...Array(FIELD_COUNT - 1).fill(BigInt(0))]
        const epochKey = BigInt(129014)
        await unirepContract
            .connect(attester)
            .attest(epochKey, epoch, fieldIndex, a1)
            .then((t) => t.wait())

        const tx = await unirepContract
            .connect(attester)
            .attest(epochKey, epoch, fieldIndex, a2)

        expect(tx).to.emit(unirepContract, 'EpochTreeLeaf').withArgs(
            epoch,
            attester.address,
            1, // first epoch tree leaf
            genEpochTreeLeaf(epochKey, data)
        )
    })

    it('should fail to submit too many attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        for (let x = 0; x < EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT + 1)
            const val = hash1([Math.floor(Math.random() * 10000000000)])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
        await expect(
            unirepContract.connect(attester).attest(2, epoch, 0, 1)
        ).to.be.revertedWithCustomError(unirepContract, 'MaxAttestations')
    })

    it('should submit attestations after max attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        for (let x = 0; x < EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT)
            const val = hash1([Math.floor(Math.random() * 10000000000)])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
        for (let x = 0; x < EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT)
            const val = hash1([Math.floor(Math.random() * 10000000000)])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
    })

    it('should fail to submit attestation with wrong epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const wrongEpoch = 444444
        const epochKey = BigInt(24910)
        await expect(
            unirepContract.connect(attester).attest(epochKey, wrongEpoch, 1, 1)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit attestation with invalid epoch key', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = 0
        await expect(
            unirepContract
                .connect(attester)
                .attest(SNARK_SCALAR_FIELD, epoch, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochKey')
    })

    it('should fail to submit attestation after epoch ends', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const oldEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const newEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        expect(oldEpoch.toString()).not.equal(newEpoch.toString())

        await expect(
            unirepContract.connect(attester).attest(epochKey, oldEpoch, 1, 1)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit from non-attester', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const wrongAttester = accounts[5]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)

        await expect(
            unirepContract.connect(wrongAttester).attest(epochKey, epoch, 1, 1)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('should submit attestation with graffiti', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)
        const fieldIndex = SUM_FIELD_COUNT
        const val = 1
        const tx = await unirepContract
            .connect(attester)
            .attest(epochKey, epoch, fieldIndex, val)
        const { timestamp } = await tx
            .wait()
            .then(({ blockNumber }) => ethers.provider.getBlock(blockNumber))

        expect(tx)
            .to.emit(unirepContract, 'Attestation')
            .withArgs(
                epoch,
                epochKey,
                attester.address,
                fieldIndex,
                val,
                timestamp
            )
    })

    it('should fail to submit attestation with out of range graffiti', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)
        expect(
            unirepContract
                .connect(attester)
                .attest(epochKey, epoch, SUM_FIELD_COUNT, SNARK_SCALAR_FIELD)
        ).to.be.revertedWithCustomError(unirepContract, 'OutOfRange')
    })

    it('should submit attestation without graffiti', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)

        const fieldIndex = 1
        const val = 5
        const tx = await unirepContract
            .connect(attester)
            .attest(epochKey, epoch, fieldIndex, val)
        await tx.wait()
        const { timestamp } = await tx
            .wait()
            .then(({ blockNumber }) => ethers.provider.getBlock(blockNumber))

        expect(tx)
            .to.emit(unirepContract, 'Attestation')
            .withArgs(
                epoch,
                epochKey,
                attester.address,
                fieldIndex,
                val,
                timestamp
            )
    })
})
