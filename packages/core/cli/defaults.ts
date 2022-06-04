import { CircuitConfig } from '@unirep/circuits'
import { ContractConfig } from '@unirep/contracts'
import { ethers } from 'ethers'
import path from 'path'

// const DEFAULT_ETH_PROVIDER = `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`
// const DEFAULT_ETH_PROVIDER = `https://goerli.infura.io/v3/${INFURA_API_KEY}`
const DEFAULT_ETH_PROVIDER = 'http://localhost:8545'
const DEFAULT_START_BLOCK = 0
const DEFAULT_EPOCH_LENGTH = 600
const DEFAULT_ATTESTING_FEE = ethers.utils.parseEther('0')
const DEFAULT_ZK_PATH = path.join(__dirname, '../../circuits/zksnarkBuild')
const DEFAULT_ARTIFACTS_PATH = path.join(
    __dirname,
    '../../contracts/build/artifacts'
)
const CIRCUIT_CONFIG: CircuitConfig = require(path.join(
    DEFAULT_ZK_PATH,
    'config.json'
))

const CONTRACT_CONFIG = {
    attestingFee: ethers.utils.parseEther('0.1'),
    epochLength: 30,
    maxUsers: 10,
    maxAttesters: 10,
    ...CIRCUIT_CONFIG,
} as ContractConfig

export {
    DEFAULT_ETH_PROVIDER,
    DEFAULT_START_BLOCK,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ATTESTING_FEE,
    DEFAULT_ZK_PATH,
    DEFAULT_ARTIFACTS_PATH,
    CONTRACT_CONFIG,
}
