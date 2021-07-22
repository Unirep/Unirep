import { ethers } from 'ethers'

const globalStateTreeDepth = 4;

const userStateTreeDepth = 4;

const epochTreeDepth = 80;

const nullifierTreeDepth = 80;

const maxUsers = 2 ** globalStateTreeDepth - 1;

const attestingFee = ethers.utils.parseEther("0.01")

const numEpochKeyNoncePerEpoch = 2;

const numAttestationsPerEpochKey = 6;

const epochLength = 30;  // 30 seconds


const circuitGlobalStateTreeDepth = 4;

const circuitUserStateTreeDepth = 4;

const circuitEpochTreeDepth = 32;

const circuitNullifierTreeDepth = 128;

const defaultAirdroppedKarma = 20;

const maxKarmaBudget = 10;

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
    maxUsers,
    nullifierTreeDepth,
    numAttestationsPerEpochKey,
    userStateTreeDepth,
    defaultAirdroppedKarma,
    maxKarmaBudget,
}