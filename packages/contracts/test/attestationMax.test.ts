// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { SNARK_SCALAR_FIELD } from '@unirep/circuits'
import { F, hash1, genEpochTreeLeaf } from '@unirep/utils'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import defaultConfig from '@unirep/circuits/config'

const { FIELD_COUNT, SUM_FIELD_COUNT, REPL_NONCE_BITS } = defaultConfig

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
        for (let x = 0; x < 2 ** EPOCH_TREE_DEPTH; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT + 1)
            const val =
                hash1([Math.floor(Math.random() * 10000000000)]) >>
                BigInt(REPL_NONCE_BITS)
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
        await expect(
            unirepContract.connect(attester).attest(2, epoch, 0, 1)
        ).to.be.revertedWith('ReusableMerkleTree: tree is full')
    })

    it('should submit attestations after max attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        for (let x = 0; x < 2 ** EPOCH_TREE_DEPTH; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT)
            const val = hash1([Math.floor(Math.random() * 10000000000)])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
        for (let x = 0; x < 2 ** EPOCH_TREE_DEPTH; x++) {
            const epochKey = BigInt(x + 100000)
            const fieldIndex = Math.floor(Math.random() * SUM_FIELD_COUNT)
            const val = hash1([Math.floor(Math.random() * 10000000000)])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
    })
})
