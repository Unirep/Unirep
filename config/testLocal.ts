import { ethers } from 'ethers'

const globalStateTreeDepth = 4;

const userStateTreeDepth = 4;

const epochTreeDepth = 80;

const nullifierTreeDepth = 80;

const maxUsers = 2 ** globalStateTreeDepth - 1;

const attestingFee = ethers.utils.parseEther("0.01")

const maxEpochKeyNonce = 2;

// NOTE: this constant must be the same as `MAX_ATTESTATIONS_PER_EPOCH_KEY` in Unirep contract
const numAttestationsPerEpochKey = 10;

const epochLength = 30;  // 30 seconds


const circuitGlobalStateTreeDepth = 4;

const circuitUserStateTreeDepth = 4;

const circuitEpochTreeDepth = 8;

const circuitNullifierTreeDepth = 8;

export {
    attestingFee,
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
    circuitNullifierTreeDepth,
    epochLength,
    epochTreeDepth,
    globalStateTreeDepth,
    maxEpochKeyNonce,
    maxUsers,
    nullifierTreeDepth,
    numAttestationsPerEpochKey,
    userStateTreeDepth
}