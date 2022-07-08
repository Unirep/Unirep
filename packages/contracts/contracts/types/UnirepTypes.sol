// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity ^0.8.0;

interface UnirepTypes {
    struct Attestation {
        // The attester’s ID
        uint256 attesterId;
        // Positive reputation
        uint256 posRep;
        // Negative reputation
        uint256 negRep;
        // A hash of an arbitary string
        uint256 graffiti;
        // A flag to indicate if user has signed up in the attester's app
        uint256 signUp;
    }

    struct Config {
        // circuit config
        uint8 globalStateTreeDepth;
        uint8 userStateTreeDepth;
        uint8 epochTreeDepth;
        uint256 numEpochKeyNoncePerEpoch;
        uint256 maxReputationBudget;
        uint256 numAttestationsPerProof;
        // contract config
        uint256 epochLength;
        uint256 attestingFee;
        uint256 maxUsers;
        uint256 maxAttesters;
    }
}
