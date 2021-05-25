pragma solidity 0.7.6;

import { SnarkConstants } from "./SnarkConstants.sol";
import { Hasher } from "./Hasher.sol";

contract ComputeRoot is Hasher {

    uint8 internal constant LEAVES_PER_NODE = 5;

    function computeEmptyRoot(uint8 _treeLevels, uint256 _zeroValue) public pure returns (uint256) {
        // Limit the Merkle tree to MAX_DEPTH levels
        require(
            _treeLevels > 0 && _treeLevels <= 256,
            "ComputeRoot: _treeLevels must be between 0 and 256"
        );

        uint256 currentZero = _zeroValue;
        for (uint8 i = 1; i < _treeLevels; i++) {
            uint256 hashed = hashLeftRight(currentZero, currentZero);
            currentZero = hashed;
        }

        return hashLeftRight(currentZero, currentZero);
    }
}