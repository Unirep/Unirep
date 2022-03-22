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

    struct TreeDepths {
        uint8 globalStateTreeDepth;
        uint8 userStateTreeDepth;
        uint8 epochTreeDepth;
    }

    struct MaxValues {
        uint256 maxUsers;
        uint256 maxAttesters;
    }

    struct ProofsRelated {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        bool isValid;
    }

    struct EpochKeyProof {
        uint256 globalStateTree;
        uint256 epoch;
        uint256 epochKey;
        uint256[8] proof;
    }

    struct SignUpProof {
        uint256 epoch;
        uint256 epochKey;
        uint256 globalStateTree;
        uint256 attesterId;
        uint256 userHasSignedUp;
        uint256[8] proof;
    }

    struct UserTransitionProof {
        uint256 newGlobalStateTreeLeaf;
        uint256[] epkNullifiers;
        uint256 transitionFromEpoch;
        uint256[] blindedUserStates;
        uint256 fromGlobalStateTree;
        uint256[] blindedHashChains;
        uint256 fromEpochTree;
        uint256[8] proof;
    }

    struct ReputationProof {
        uint256[] repNullifiers;
        uint256 epoch;
        uint256 epochKey;
        uint256 globalStateTree;
        uint256 attesterId;
        uint256 proveReputationAmount;
        uint256 minRep;
        uint256 proveGraffiti;
        uint256 graffitiPreImage;
        uint256[8] proof;
    }
}
