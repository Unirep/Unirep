// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { CircuitConfig } from '@unirep/circuits'
import { poseidon1 } from 'poseidon-lite'

import { EPOCH_LENGTH } from './config'
import { deployUnirep } from '../deploy'

const { SUM_FIELD_COUNT, REPL_FIELD_BITS } = CircuitConfig.default

const EPOCH_TREE_DEPTH = 3

describe('Attestations max', function () {
    this.timeout(120000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0], {
            EPOCH_TREE_DEPTH,
        })
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            const accounts = await ethers.getSigners()
            const attester = accounts[1]
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should fail to submit too many attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        for (let x = 0; x < 2 ** EPOCH_TREE_DEPTH - 1; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT + 1)
            const val =
                poseidon1([Math.floor(Math.random() * 10000000000)]) %
                BigInt(2) ** BigInt(REPL_FIELD_BITS)
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
        await expect(
            unirepContract.connect(attester).attest(2, epoch, 0, 1)
        ).to.be.revertedWith('LazyMerkleTree: tree is full')
    })

    it('should submit attestations after max attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        for (let x = 0; x < 2 ** EPOCH_TREE_DEPTH - 1; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT)
            const val = poseidon1([Math.floor(Math.random() * 10000000000)])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
        for (let x = 0; x < 2 ** EPOCH_TREE_DEPTH - 1; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT)
            const val = poseidon1([Math.floor(Math.random() * 10000000000)])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
    })
})
