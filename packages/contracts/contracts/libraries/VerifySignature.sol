// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

// TODO: update doc
/// @title VerifySignature
contract VerifySignature {
    /// @dev Verify if the signer has a valid signature as claimed
    /// @param signer The address of attester who wants to perform an action
    /// @param epochLength The epoch length of attester
    /// @param signature The signature signed by the attester
    /// @return isValid True if the signature is valid, false otherwise
    function isValidSignature(
        address signer,
        uint256 epochLength,
        bytes memory signature
    ) internal view returns (bool) {
        // Attester signs over it's own address concatenated with this contract address
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        bytes32 messageHash = ECDSA.toEthSignedMessageHash(
            keccak256(
                abi.encodePacked(address(this), signer, epochLength, chainId)
            )
        );
        return ECDSA.recover(messageHash, signature) == signer;
    }
}
