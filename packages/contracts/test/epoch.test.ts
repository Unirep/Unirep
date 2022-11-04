// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree, SparseMerkleTree } from '@unirep/crypto'
import { EPOCH_TREE_DEPTH, STATE_TREE_DEPTH } from '@unirep/circuits'
import { defaultEpochTreeLeaf } from '@unirep/circuits/test/utils'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

describe('Epoch', function () {
    this.timeout(120000)

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

    it('should update epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const startEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const emptyStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const emptyEpochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        for (let x = startEpoch.toNumber(); x < 10; x++) {
            const prevEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )

            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await unirepContract.updateEpochIfNeeded(attester.address)

            // attester should have the current data
            const newEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            expect(prevEpoch.toNumber() + 1).to.equal(newEpoch.toNumber())

            const stateTreeRoot = await unirepContract.attesterStateTreeRoot(
                attester.address,
                newEpoch
            )
            expect(stateTreeRoot.toString()).to.equal(
                emptyStateTree.root.toString()
            )

            const exist = await unirepContract.attesterStateTreeRootExists(
                attester.address,
                newEpoch,
                stateTreeRoot
            )
            expect(exist).to.be.true

            const epochRoot = await unirepContract.attesterEpochRoot(
                attester.address,
                newEpoch
            )
            expect(epochRoot.toString()).to.equal(
                emptyEpochTree.root.toString()
            )
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
