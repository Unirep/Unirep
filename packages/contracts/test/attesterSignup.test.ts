// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree } from '@unirep/crypto'
import {
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

describe('Attester Signup', function () {
    this.timeout(120000)

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
        expect(STATE_TREE_DEPTH).equal(config.stateTreeDepth)
    })

    it('should fail to double signup', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await expect(
            unirepContract.connect(attester).attesterSignUp(EPOCH_LENGTH)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterAlreadySignUp')
    })

    it('should signup attester', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[2]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())

        const currentEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        expect(currentEpoch.toString()).to.equal('0')
        const epochTimeRemaining =
            await unirepContract.attesterEpochRemainingTime(attester.address)
        expect(epochTimeRemaining.toNumber()).to.be.lte(+EPOCH_LENGTH)
        const epochLength = await unirepContract.attesterEpochLength(
            attester.address
        )
        expect(epochLength.toNumber()).to.equal(EPOCH_LENGTH)

        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const exists = await unirepContract.attesterStateTreeRootExists(
            attester.address,
            currentEpoch,
            stateTree.root
        )
        expect(exists).to.be.true
        const stateRoot = await unirepContract.attesterStateTreeRoot(
            attester.address,
            currentEpoch
        )
        expect(stateRoot).to.equal(stateTree.root)
        const semaphoreRoot = await unirepContract.attesterSemaphoreGroupRoot(
            attester.address
        )
        expect(semaphoreRoot).to.equal(stateTree.root)
        for (let x = 1; x < 10; x++) {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
            const _currentEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            expect(_currentEpoch.toString()).to.equal(x.toString())
        }
    })
})
