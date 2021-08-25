import { ethers } from 'ethers'

const globalStateTreeDepth = 16;

const userStateTreeDepth = 16;

const epochTreeDepth = 64;

const nullifierTreeDepth = 128;

const maxUsers = 2 ** globalStateTreeDepth - 1;

const attestingFee = ethers.utils.parseEther("0.01")

const numEpochKeyNoncePerEpoch = 5;

const numAttestationsPerProof = 10;

const epochLength = 30;  // 30 seconds


const circuitGlobalStateTreeDepth = 16;

const circuitUserStateTreeDepth = 16;

const circuitEpochTreeDepth = 64;

const circuitNullifierTreeDepth = 128;

const maxReputationBudget = 10;

export {
    attestingFee,
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
    circuitNullifierTreeDepth,
    epochLength,
    epochTreeDepth,
    globalStateTreeDepth,
    numEpochKeyNoncePerEpoch,
    numAttestationsPerProof,
    maxUsers,
    nullifierTreeDepth,
    userStateTreeDepth,
    maxReputationBudget,
}