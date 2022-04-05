//  TODO: better setup for cli Ethereum client.
// import { ALCHEMY_API_KEY } from '../config/privateKey'

import {
    EPOCH_LENGTH,
} from "@unirep/config"
import { ethers } from "ethers"

// apply the api key from https://www.alchemy.com/
// const DEFAULT_ETH_PROVIDER = `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`
// const DEFAULT_ETH_PROVIDER = `https://goerli.infura.io/v3/${INFURA_API_KEY}`
const DEFAULT_ETH_PROVIDER = 'http://localhost:8545'
const DEFAULT_START_BLOCK = 0
const DEFAULT_EPOCH_LENGTH = EPOCH_LENGTH
const DEFAULT_ATTESTING_FEE = ethers.utils.parseEther('0')

const DEFAULT_TREE_DEPTHS_CONFIG = 'circuit'

export {
    DEFAULT_ETH_PROVIDER,
    DEFAULT_START_BLOCK,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ATTESTING_FEE,
    DEFAULT_TREE_DEPTHS_CONFIG,
}
