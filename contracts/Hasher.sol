/*
 * Hasher object to abstract out hashing logic
 * to be shared between multiple files
 *
 * This file is part of maci
 */

pragma solidity ^0.5.0;

import {PoseidonT3, PoseidonT6} from "./Poseidon.sol";

import {SnarkConstants} from "./SnarkConstants.sol";


contract Hasher is SnarkConstants {
    function hash5(uint256[] memory array) public pure returns (uint256) {
        return PoseidonT6.poseidon(array);
    }

    function hashLeftRight(uint256 _left, uint256 _right)
        public
        pure
        returns (uint256)
    {
        uint256[] memory input = new uint256[](2);
        input[0] = _left;
        input[1] = _right;
        return PoseidonT3.poseidon(input);
    }
}