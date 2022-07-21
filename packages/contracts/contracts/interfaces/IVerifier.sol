// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Verifier interface
// Verifier should follow IVerifer interface.
interface IVerifier {
    /**
     * @return bool Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(uint256[8] calldata proof, uint256[] calldata input)
        external
        view
        returns (bool);
}
