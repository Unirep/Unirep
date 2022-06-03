import { CircuitConfig } from '@unirep/circuits'
import { ethers } from 'ethers'
import path from 'path'

import { ContractConfig } from '../src/types/config'

export const zkFilesPath = path.join(__dirname, '../../circuits/zksnarkBuild')
export const verifiersPath = path.join(__dirname, '../contracts/verifiers')
export const artifactsPath = path.join(__dirname, '../build/artifacts')
const circuitConfig: CircuitConfig = require(path.join(
    zkFilesPath,
    'config.json'
))

export default {
    attestingFee: ethers.utils.parseEther('0.1'),
    epochLength: 30,
    maxUsers: 10,
    maxAttesters: 10,
    ...circuitConfig,
} as ContractConfig
