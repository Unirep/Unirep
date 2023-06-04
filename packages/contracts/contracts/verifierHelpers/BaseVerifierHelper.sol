// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVerifier} from '../interfaces/IVerifier.sol';

contract BaseVerifierHelper {
    IVerifier verifier;

    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    struct EpochKeySignals {
        bool revealNonce;
        uint8 nonce;
        uint48 epoch;
        uint160 attesterId;
        uint256 stateTreeRoot;
        uint256 epochKey;
        uint256 data;
    }

    struct ReputationSignals {
        bool proveGraffiti;
        bool proveMinRep;
        bool proveMaxRep;
        bool proveZeroRep;
        bool revealNonce;
        uint8 nonce;
        uint48 epoch;
        uint160 attesterId;
        uint256 stateTreeRoot;
        uint256 epochKey;
        uint256 graffiti;
        uint256 minRep;
        uint256 maxRep;
    }

    error AttesterInvalid();
    error InvalidEpochKey();
    error InvalidProof();
    error CallerInvalid();

    function decodeEpochKeyControl(
        uint256 control
    )
        public
        pure
        returns (
            bool revealNonce,
            uint160 attesterId,
            uint48 epoch,
            uint8 nonce
        )
    {
        uint8 attesterIdBits = 160;
        uint8 epochBits = 48;
        uint8 nonceBits = 8;
        revealNonce =
            ((control >> (attesterIdBits + epochBits + nonceBits)) & 1) != 0;
        attesterId = uint160(
            (control >> (epochBits + nonceBits)) & ((1 << attesterIdBits) - 1)
        );
        epoch = uint48((control >> nonceBits) & ((1 << epochBits) - 1));
        nonce = uint8(control & ((1 << nonceBits) - 1));
        return (revealNonce, attesterId, epoch, nonce);
    }

    constructor(IVerifier _verifier) {
        verifier = _verifier;
    }
}
