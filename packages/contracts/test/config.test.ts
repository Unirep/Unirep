// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { hash4, SparseMerkleTree } from '@unirep/utils'
import {
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits'

import { deployUnirep } from '../deploy'

describe('Config', function () {
    this.timeout(120000)
    let unirepContract
    const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])

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
        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        expect(tree.root.toString()).equal(config.emptyEpochTreeRoot.toString())
    })

    it('helper functions', async () => {
        const maxEpochKey = await unirepContract.maxEpochKey()
        expect(2 ** EPOCH_TREE_DEPTH - 1).equal(maxEpochKey)

        const stateTreeDepth = await unirepContract.stateTreeDepth()
        expect(STATE_TREE_DEPTH).equal(stateTreeDepth)

        const epochTreeDepth = await unirepContract.epochTreeDepth()
        expect(EPOCH_TREE_DEPTH).equal(epochTreeDepth)

        const numEpochKeyNoncePerEpoch =
            await unirepContract.numEpochKeyNoncePerEpoch()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(numEpochKeyNoncePerEpoch)
    })
})
