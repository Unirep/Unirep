'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
require('@typechain/hardhat')
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle')
const config = {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            blockGasLimit: 12000000,
        },
        local: {
            url: 'http://localhost:8545',
        },
    },
    solidity: {
        version: '0.8.0',
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    paths: {
        artifacts: '../contracts/artifacts',
    },
}
exports.default = config
