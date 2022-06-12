import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import 'hardhat-gas-reporter'

const config: HardhatUserConfig = {
    defaultNetwork: 'hardhat',
    paths: {
        artifacts: '../contracts/build/artifacts',
    },
    networks: {
        hardhat: {
            blockGasLimit: 12000000,
        },
        local: {
            url: 'http://localhost:8545',
        },
    },
    solidity: {
        compilers: [
            {
                version: '0.8.0',
                settings: {
                    optimizer: { enabled: true, runs: 200 },
                },
            },
        ],
    },

    gasReporter: {
        enabled: process.env.REPORT_GAS ? true : false,
    },
}

export default config
