/*
 * Hasher object to abstract out hashing logic
 */

pragma solidity ^0.8.0;

contract Hasher {
    function hashProof(uint256[] memory publicSignals, uint256[8] memory proof)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(publicSignals, proof));
    }
}
