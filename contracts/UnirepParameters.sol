pragma experimental ABIEncoderV2;
pragma solidity ^0.6.0;

contract UnirepParameters {
    // This structs help to reduce the number of parameters to the constructor
    // and avoid a stack overflow error during compilation
    struct TreeDepths {
        uint8 globalStateTreeDepth;
        uint8 userStateTreeDepth;
        uint8 nullifierTreeDepth;
        uint8 epochTreeDepth;
    }

    struct MaxValues {
        uint256 maxUsers;
        uint8 maxEpochKeyNonce;
    }

    struct ProofsRelated {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        bool isValid;
    }
}