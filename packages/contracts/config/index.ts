import { ethers } from 'ethers'

const attestingFee = ethers.utils.parseEther("0.1")

const numEpochKeyNoncePerEpoch = 3;

const numAttestationsPerProof = 5;

const epochLength = 30;  // 30 seconds


const circuitGlobalStateTreeDepth = 4;

const circuitUserStateTreeDepth = 4;

const circuitEpochTreeDepth = 32;

const globalStateTreeDepth = circuitGlobalStateTreeDepth;

const userStateTreeDepth = circuitUserStateTreeDepth;

const epochTreeDepth = circuitEpochTreeDepth;

const maxReputationBudget = 10;

const maxUsers = 2 ** circuitGlobalStateTreeDepth - 1;

const maxAttesters = 2 ** circuitUserStateTreeDepth - 1;

export {
    attestingFee,
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
    epochLength,
    epochTreeDepth,
    globalStateTreeDepth,
    numEpochKeyNoncePerEpoch,
    numAttestationsPerProof,
    maxUsers,
    maxAttesters,
    userStateTreeDepth,
    maxReputationBudget,
}