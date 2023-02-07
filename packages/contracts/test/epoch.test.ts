// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree, SparseMerkleTree } from '@unirep/utils'
import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    defaultEpochTreeLeaf,
} from '@unirep/circuits'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import {
    bootstrapAttestations,
    bootstrapUsers,
    processAttestations,
} from '@unirep/test'

describe('Epoch', function () {
    this.timeout(0)

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

    it('should update epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const startEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const emptyStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const emptyEpochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        for (let x = startEpoch.toNumber(); x < 5; x++) {
            const prevEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            const { stateTree } = await bootstrapUsers(
                attester,
                unirepContract,
                {
                    userNum: 3,
                    epoch: prevEpoch.toNumber(),
                }
            )
            const epochTree = await bootstrapAttestations(
                attester,
                prevEpoch.toNumber(),
                unirepContract,
                {
                    epkNum: 3,
                    attestNum: 5,
                }
            )
            const prevStateTreeRoot =
                await unirepContract.attesterStateTreeRoot(
                    attester.address,
                    prevEpoch
                )
            await processAttestations(attester, prevEpoch, unirepContract)
            const prevEpochTreeRoot = await unirepContract.attesterEpochRoot(
                attester.address,
                prevEpoch
            )
            expect(prevStateTreeRoot.toString()).to.equal(
                stateTree.root.toString()
            )
            expect(prevEpochTreeRoot.toString()).to.equal(
                epochTree.root.toString()
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
