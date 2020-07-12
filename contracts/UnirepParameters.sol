pragma experimental ABIEncoderV2;
pragma solidity ^0.5.0;

contract UnirepParameters {
    // This structs help to reduce the number of parameters to the constructor
    // and avoid a stack overflow error during compilation
    struct TreeDepths {
        uint8 globalStateTreeDepth;
        uint8 userStateTreeDepth;
    }

    struct MaxValues {
        uint256 maxUsers;
    }
}