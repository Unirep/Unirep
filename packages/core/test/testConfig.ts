import { CircuitConfig } from '@unirep/circuits'
import { ContractConfig } from '@unirep/contracts'
import { ethers } from 'ethers'
import path from 'path'
const zkFilesPath = path.join(__dirname, '../../circuits/zksnarkBuild')
const artifactsPath = path.join(__dirname, '../../contracts/build/artifacts')
const circuitConfig: CircuitConfig = require(path.join(
    zkFilesPath,
    'config.json'
))

const config = {
    attestingFee: ethers.utils.parseEther('0.1'),
    epochLength: 30,
    maxUsers: 10,
    maxAttesters: 10,
    ...circuitConfig,
} as ContractConfig

export { config, zkFilesPath, artifactsPath }
