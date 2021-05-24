import { HardhatUserConfig } from "hardhat/config"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      blockGasLimit: 12000000
    },
    local: {
      url: "http://localhost:8545"
    },
  },
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
}

export default config;