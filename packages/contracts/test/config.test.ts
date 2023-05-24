// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { CircuitConfig } from '@unirep/circuits'

const { EPOCH_TREE_DEPTH, STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } =
    CircuitConfig.default

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
        expect(STATE_TREE_DEPTH).equal(config.stateTreeDepth)
    })

    it('helper functions', async () => {
        const stateTreeDepth = await unirepContract.stateTreeDepth()
        expect(STATE_TREE_DEPTH).equal(stateTreeDepth)

        const epochTreeDepth = await unirepContract.epochTreeDepth()
        expect(EPOCH_TREE_DEPTH).equal(epochTreeDepth)

        const numEpochKeyNoncePerEpoch =
            await unirepContract.numEpochKeyNoncePerEpoch()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(numEpochKeyNoncePerEpoch)
    })

    it('should fail to deploy with too many data fields', async () => {
        const factory = await ethers.getContractFactory('Unirep', {
            libraries: {
                '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol:IncrementalBinaryTree':
                    '0x0000000000000000000000000000000000000000',
                'contracts/libraries/ReusableMerkleTree.sol:ReusableMerkleTree':
                    '0x0000000000000000000000000000000000000000',
                'contracts/libraries/LazyMerkleTree.sol:LazyMerkleTree':
                    '0x0000000000000000000000000000000000000000',
                'poseidon-solidity/PoseidonT3.sol:PoseidonT3':
                    '0x0000000000000000000000000000000000000000',
            },
        })
        const config = new CircuitConfig({
            ...CircuitConfig.default,
            FIELD_COUNT: 128,
        })
        await expect(
            factory.deploy(
                config.contractConfig,
                '0x0000000000000000000000000000000000000000',
                '0x0000000000000000000000000000000000000000',
                '0x0000000000000000000000000000000000000000',
                '0x0000000000000000000000000000000000000000',
                '0x0000000000000000000000000000000000000000'
            )
        ).to.be.revertedWith('datasize')
    })
})
