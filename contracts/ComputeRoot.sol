pragma solidity 0.8.0;

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

    function computeOneNonZeroLeafRoot(uint8 _treeLevels, uint256 _leafIndex, uint256 _leafValue, uint256 _zeroValue) public pure returns (uint256) {
        // Limit the Merkle tree to MAX_DEPTH levels
        require(
            _treeLevels > 0 && _treeLevels <= 256,
            "ComputeRoot: _treeLevels must be between 0 and 256"
        );

        uint256 currentNewPath = _leafValue;
        uint256 currentZero = _zeroValue;
        uint256 currentIdx = _leafIndex;
        for (uint8 i = 1; i < _treeLevels + 1; i++) {
            uint256 defaultHashed = hashLeftRight(currentZero, currentZero);
            if(currentIdx % 2 == 0) {
                currentNewPath = hashLeftRight(currentNewPath, currentZero);
            } else {
                currentNewPath = hashLeftRight(currentZero, currentNewPath);
            }
            currentZero = defaultHashed;
            currentIdx = currentIdx / 2;
        }
        return currentNewPath;
    }
}