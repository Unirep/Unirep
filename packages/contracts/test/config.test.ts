// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { CircuitConfig } from '@unirep/circuits'

const {
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    HISTORY_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    SUM_FIELD_COUNT,
    REPL_NONCE_BITS,
    REPL_FIELD_BITS,
} = CircuitConfig.default

import { deployUnirep } from '../deploy'

describe('Config', function () {
    this.timeout(120000)
    let unirepContract
    let CHAIN_ID

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const network = await accounts[0].provider.getNetwork()
        CHAIN_ID = network.chainId
    })

    it('should have the correct config value', async () => {
        const config = await unirepContract.config()
        expect(STATE_TREE_DEPTH).equal(config.stateTreeDepth)
        expect(EPOCH_TREE_DEPTH).equal(config.epochTreeDepth)
        expect(HISTORY_TREE_DEPTH).equal(config.historyTreeDepth)
        expect(FIELD_COUNT).equal(config.fieldCount)
        expect(SUM_FIELD_COUNT).equal(config.sumFieldCount)
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(
            config.numEpochKeyNoncePerEpoch
        )
        expect(REPL_NONCE_BITS).equal(config.replNonceBits)
        expect(REPL_FIELD_BITS).equal(config.replFieldBits)
    })

    it('helper functions', async () => {
        const stateTreeDepth = await unirepContract.stateTreeDepth()
        expect(STATE_TREE_DEPTH).equal(stateTreeDepth)

        const epochTreeDepth = await unirepContract.epochTreeDepth()
        expect(EPOCH_TREE_DEPTH).equal(epochTreeDepth)

        const historyTreeDepth = await unirepContract.historyTreeDepth()
        expect(HISTORY_TREE_DEPTH).equal(historyTreeDepth)

        const fieldCount = await unirepContract.fieldCount()
        expect(FIELD_COUNT).equal(fieldCount)

        const sumFieldCount = await unirepContract.sumFieldCount()
        expect(SUM_FIELD_COUNT).equal(sumFieldCount)

        const numEpochKeyNoncePerEpoch =
            await unirepContract.numEpochKeyNoncePerEpoch()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(numEpochKeyNoncePerEpoch)

        const replNonceBits = await unirepContract.replNonceBits()
        expect(REPL_NONCE_BITS).equal(replNonceBits)

        const replFieldBits = await unirepContract.replFieldBits()
        expect(REPL_FIELD_BITS).equal(replFieldBits)

        const chainId = await unirepContract.chainid()
        expect(CHAIN_ID).equal(chainId)
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
                '0x0000000000000000000000000000000000000000'
            )
        ).to.be.revertedWith('datasize')
    })
})
