// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree } from '@unirep/utils'
import { CircuitConfig } from '@unirep/circuits'

const { STATE_TREE_DEPTH, EPOCH_TREE_DEPTH } = CircuitConfig.default

import { EPOCH_LENGTH } from './config'
import { deployUnirep } from '../deploy'

describe('Epoch', function () {
    this.timeout(0)

    let unirepContract
    let attester
    let attesterId

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        attester = accounts[1]
        attesterId = await attester.getAddress()
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])

            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should update epoch', async () => {
        const startEpoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const emptyStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        for (let x = startEpoch; x < 5; x++) {
            const prevEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )

            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await unirepContract
                .updateEpochIfNeeded(attesterId)
                .then((t) => t.wait())

            // attester should have the current data
            const newEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            expect(prevEpoch + BigInt(1)).to.equal(newEpoch)

            const stateTreeRoot = await unirepContract.attesterStateTreeRoot(
                attesterId
            )
            expect(stateTreeRoot.toString()).to.equal(
                emptyStateTree.root.toString()
            )
            const epochTree = new IncrementalMerkleTree(EPOCH_TREE_DEPTH)
            const epochRoot = await unirepContract.attesterEpochRoot(
                attesterId,
                newEpoch
            )
            expect(epochRoot.toString()).to.equal(epochTree.root.toString())
        }
    })

    it('should fail to update epoch with non-signup attester', async () => {
        const address = 12345 // non-signup attester
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract.updateEpochIfNeeded(address)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })
})
