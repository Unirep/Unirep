// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

// verify signature use for relayer
// NOTE: This method not safe, contract may attack by signature replay.
contract VerifySignature {
    /**
     * Verify if the signer has a valid signature as claimed
     * @param signer The address of user who wants to perform an action
     * @param signature The signature signed by the signer
     */
    function isValidSignature(address signer, bytes memory signature)
        internal
        view
        returns (bool)
    {
        // Attester signs over it's own address concatenated with this contract address
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                '\x19Ethereum Signed Message:\n32',
                keccak256(abi.encodePacked(signer, this))
            )
        );
        return ECDSA.recover(messageHash, signature) == signer;
    }
}
