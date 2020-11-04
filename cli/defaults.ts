import { attestingFee, epochLength, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch } from '../config/testLocal'

const DEFAULT_ETH_PROVIDER = 'http://localhost:8545'
const DEFAULT_START_BLOCK = 0
const DEFAULT_MAX_EPOCH_KEY_NONCE = numEpochKeyNoncePerEpoch
const DEFAULT_NUM_ATTESTATIONS_PER_EPOCH_KEY = numAttestationsPerEpochKey
const DEFAULT_EPOCH_LENGTH = epochLength
const DEFAULT_ATTESTING_FEE = attestingFee
const DEFAULT_TREE_DEPTHS_CONFIG = 'circuit'

export {
    DEFAULT_ETH_PROVIDER,
    DEFAULT_START_BLOCK,
    DEFAULT_MAX_EPOCH_KEY_NONCE,
    DEFAULT_NUM_ATTESTATIONS_PER_EPOCH_KEY,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ATTESTING_FEE,
    DEFAULT_TREE_DEPTHS_CONFIG,
}