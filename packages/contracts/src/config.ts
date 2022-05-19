import { CircuitConfig } from "@unirep/circuits";
import { ethers } from "ethers";
import path from "path";

import { ContractConfig } from "./types/config";

export const zkFilesPath = path.join(__dirname, '../../circuits/zksnarkBuild')
export const buildContractPath = path.join(__dirname, '../build')
export const verifiersPath = path.join(__dirname, '../contracts/verifiers')
const config: CircuitConfig = require(path.join(zkFilesPath, 'config.json'))

export default {
    attestingFee: ethers.utils.parseEther('0.1'),
    epochLength: 30,
    maxUsers: 10,
    maxAttesters: 10,
    ...config
} as ContractConfig