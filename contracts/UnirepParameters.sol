pragma abicoder v2;
pragma solidity 0.7.6;

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
    }

    struct ProofsRelated {
        uint256[] publicSignals;
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        bool isValid;
    }

    struct UserTransitionedRelated{
        uint256 fromEpoch;
        uint256 fromGlobalStateTree;
        uint256 fromEpochTree;
        uint256 fromNullifierTreeRoot;
        uint256 newGlobalStateTreeLeaf;
        uint256[8] proof;
        uint256[] attestationNullifiers;
        uint256[] epkNullifiers;
    }
}