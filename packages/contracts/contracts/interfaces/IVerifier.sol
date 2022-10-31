// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Verifier interface
// Verifier should follow IVerifer interface.
interface IVerifier {
    /**
     * @return bool Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) external view returns (bool);
}
