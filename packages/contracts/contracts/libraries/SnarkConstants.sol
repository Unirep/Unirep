// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Snark contants that is used in Unirep
 */
contract SnarkConstants {
    // The scalar field
    uint256 internal constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // A nothing-up-my-sleeve zero value
    // Should be equal to 16916383162496104613127564537688207714240750091683495371401923915264313510848
    uint256 ZERO_VALUE =
        uint256(keccak256(abi.encodePacked('Unirep'))) % SNARK_SCALAR_FIELD;
}
