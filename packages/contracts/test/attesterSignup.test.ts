// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree } from '@unirep/crypto'
import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

describe('Attester Signup', () => {
    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    it('should have the correct config value', async () => {
        const config = await unirepContract.config()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(
            config.numEpochKeyNoncePerEpoch
        )
        expect(EPOCH_TREE_DEPTH).equal(config.epochTreeDepth)
        expect(GLOBAL_STATE_TREE_DEPTH).equal(config.globalStateTreeDepth)
    })

    it('should fail to double signup', async () => {
        const accounts = await ethers.getSigners()
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await expect(
            unirepContract.connect(accounts[1]).attesterSignUp(EPOCH_LENGTH)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterAlreadySignUp')
    })

    it('should signup attester', async () => {
        const accounts = await ethers.getSigners()
        await unirepContract
            .connect(accounts[2])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())

        const currentEpoch = await unirepContract.attesterCurrentEpoch(
            accounts[2].address
        )
        expect(currentEpoch.toString()).to.equal('0')
        const epochTimeRemaining =
            await unirepContract.attesterEpochRemainingTime(accounts[2].address)
        expect(epochTimeRemaining.toNumber()).to.be.lte(+EPOCH_LENGTH)
        const epochLength = await unirepContract.attesterEpochLength(
            accounts[2].address
        )
        expect(epochLength.toNumber()).to.equal(EPOCH_LENGTH)

        const GSTree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const exists = await unirepContract.attesterStateTreeRootExists(
            accounts[2].address,
            currentEpoch,
            GSTree.root
        )
        expect(exists).to.be.true
        const stateRoot = await unirepContract.attesterStateTreeRoot(
            accounts[2].address,
            currentEpoch
        )
        expect(stateRoot).to.equal(GSTree.root)
        const semaphoreRoot = await unirepContract.attesterSemaphoreGroupRoot(
            accounts[2].address
        )
        expect(semaphoreRoot).to.equal(GSTree.root)
        for (let x = 1; x < 10; x++) {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
            const _currentEpoch = await unirepContract.attesterCurrentEpoch(
                accounts[2].address
            )
            expect(_currentEpoch.toString()).to.equal(x.toString())
        }
    })
})
