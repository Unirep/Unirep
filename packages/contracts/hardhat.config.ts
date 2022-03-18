import { HardhatUserConfig } from "hardhat/config"
import '@typechain/hardhat'
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  paths: {
    artifacts: "./build/artifacts",
  },
  networks: {
    hardhat: {
      blockGasLimit: 12000000
    },
    local: {
      url: "http://localhost:8545"
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.1",
        settings: {
          optimizer: { enabled: true, runs: 200 }
        }
      }
    ]
  },

  typechain: {
    outDir: './typechain',
  }
}

export default config;