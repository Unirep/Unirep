pragma solidity ^0.8.0;

import {SnarkConstants} from "./SnarkConstants.sol";

//
// zk-snark helper
// 
contract zkSNARKHelper is SnarkConstants {
    function isSNARKField(uint256 value) internal pure returns(bool) {
        return value < SNARK_SCALAR_FIELD;
    }

    function isValidSignals(uint256[] memory signals) internal pure returns(bool) {
        uint256 len = signals.length;
        for (uint i = 0; i < len; ++i) {
            if (!isSNARKField(signals[i])) 
                return false;
        }
        return true;
    } 
}