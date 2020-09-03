import * as ethers from 'ethers'

const globalStateTreeDepth = 4;

const userStateTreeDepth = 4;

const nullifierTreeDepth = 80;

const maxUsers = 2 ** globalStateTreeDepth - 1;

const attestingFee = ethers.utils.parseEther("0.01")

const maxEpochKeyNonce = 2;

const numAttestationsPerBatch = 10;

const epochLength = 30;  // 30 seconds

const epochTreeDepth = 80;


const circuitGlobalStateTreeDepth = 4;

const circuitEpochTreeDepth = 4;

export {
    attestingFee,
    circuitGlobalStateTreeDepth,
    circuitEpochTreeDepth,
    epochLength,
    epochTreeDepth,
    globalStateTreeDepth,
    maxEpochKeyNonce,
    maxUsers,
    nullifierTreeDepth,
    numAttestationsPerBatch,
    userStateTreeDepth
}