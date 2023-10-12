// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IVerifier
/// @dev https://developer.unirep.io/docs/contracts-api/verifiers/iverifier-sols
interface IVerifier {
    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/iverifier-sol#verifyproof
    /// @param publicSignals The public signals of the snark proof
    /// @param proof The proof data of the snark proof
    /// @return isValid True if the proof is valid, false otherwise
    function verifyProof(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) external view returns (bool);
}
