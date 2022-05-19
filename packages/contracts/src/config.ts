import path from "path";
import { ContractConfig } from "./types/config";

export default {
    attestingFee: '0.1',
    epochLength: 30,
    maxUsers: 10,
    maxAttesters: 10
} as ContractConfig

export const zkFilesPath = path.join(__dirname, '../../circuits/zksnarkBuild')
export const buildContractPath = path.join(__dirname, '../build')
export const verifiersPath = path.join(__dirname, '../contracts/verifiers')