// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import defaultConfig from '@unirep/circuits/config'

const {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} = defaultConfig

import { deployUnirep } from '../deploy'

describe('Config', function () {
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
        expect(EPOCH_TREE_ARITY).equal(config.epochTreeArity)
        expect(STATE_TREE_DEPTH).equal(config.stateTreeDepth)
    })

    it('helper functions', async () => {
        const stateTreeDepth = await unirepContract.stateTreeDepth()
        expect(STATE_TREE_DEPTH).equal(stateTreeDepth)

        const epochTreeDepth = await unirepContract.epochTreeDepth()
        expect(EPOCH_TREE_DEPTH).equal(epochTreeDepth)

        const epochTreeArity = await unirepContract.epochTreeArity()
        expect(EPOCH_TREE_ARITY).equal(epochTreeArity)

        const numEpochKeyNoncePerEpoch =
            await unirepContract.numEpochKeyNoncePerEpoch()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(numEpochKeyNoncePerEpoch)
    })
})
