// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import {MessageHashUtils} from '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';

// TODO: update doc
/// @title VerifySignature
contract VerifySignature {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

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
        bytes32 data = keccak256(
            abi.encodePacked(address(this), signer, epochLength, chainId)
        );
        return data.toEthSignedMessageHash().recover(signature) == signer;
    }
}
