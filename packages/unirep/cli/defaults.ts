import { attestingFee, epochLength, numEpochKeyNoncePerEpoch } from '../config/testLocal'
// import { ALCHEMY_API_KEY } from '../config/privateKey'

// apply the api key from https://www.alchemy.com/
// const DEFAULT_ETH_PROVIDER = `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`
// const DEFAULT_ETH_PROVIDER = `https://goerli.infura.io/v3/${INFURA_API_KEY}`
const DEFAULT_ETH_PROVIDER = 'http://localhost:8545'
const DEFAULT_START_BLOCK = 0
const DEFAULT_MAX_EPOCH_KEY_NONCE = numEpochKeyNoncePerEpoch
const DEFAULT_EPOCH_LENGTH = epochLength
const DEFAULT_ATTESTING_FEE = attestingFee
const DEFAULT_TREE_DEPTHS_CONFIG = 'circuit'

export {
    DEFAULT_ETH_PROVIDER,
    DEFAULT_START_BLOCK,
    DEFAULT_MAX_EPOCH_KEY_NONCE,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ATTESTING_FEE,
    DEFAULT_TREE_DEPTHS_CONFIG,
}