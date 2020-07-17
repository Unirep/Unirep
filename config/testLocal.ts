import * as ethers from 'ethers'

const globalStateTreeDepth = 4;

const userStateTreeDepth = 4;

const maxUsers = 2 ** globalStateTreeDepth - 1;

const attestingFee = ethers.utils.parseEther("0.01")

const maxEpochKeyNonce = 2;

const epochLength = 30;  // 30 seconds

export {
    attestingFee,
    epochLength,
    globalStateTreeDepth,
    maxEpochKeyNonce,
    maxUsers,
    userStateTreeDepth
}