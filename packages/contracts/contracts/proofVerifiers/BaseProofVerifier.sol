// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVerifier} from '../interfaces/IVerifier.sol';

contract BaseProofVerifier {
    IVerifier verifier;

    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    struct EpochKeySignals {
        bool revealNonce;
        uint256 stateTreeRoot;
        uint256 epochKey;
        uint256 data;
        uint8 nonce;
        uint48 epoch;
        uint160 attesterId;
    }

    struct ReputationSignals {
        uint256 stateTreeRoot;
        uint256 epochKey;
        uint256 graffitiPreImage;
        uint256 proveGraffiti;
        uint8 nonce;
        uint48 epoch;
        uint160 attesterId;
        bool revealNonce;
        uint256 proveMinRep;
        uint256 proveMaxRep;
        uint256 proveZeroRep;
        uint256 minRep;
        uint256 maxRep;
    }

    error AttesterInvalid();
    error InvalidEpochKey();
    error InvalidProof();

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
        revealNonce = (control >> 232) & 1 != 0;
        attesterId = uint160((control >> 72) & ((1 << 160) - 1));
        epoch = uint48((control >> 8) & ((1 << 64) - 1));
        nonce = uint8(control & ((1 << 8) - 1));
        return (revealNonce, attesterId, epoch, nonce);
    }

    constructor(IVerifier _verifier) {
        verifier = _verifier;
    }
}
