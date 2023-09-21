// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVerifier} from '../interfaces/IVerifier.sol';

contract BaseVerifierHelper {
    IVerifier verifier;

    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public immutable chainid;

    struct EpochKeySignals {
        uint256 epochKey;
        uint256 stateTreeRoot;
        uint8 nonce;
        uint48 epoch;
        uint160 attesterId;
        bool revealNonce;
        uint48 chainId;
        uint256 data;
    }

    struct ReputationSignals {
        uint256 epochKey;
        uint256 stateTreeRoot;
        uint8 nonce;
        uint48 epoch;
        uint160 attesterId;
        bool revealNonce;
        uint48 chainId;
        uint256 minRep;
        uint256 maxRep;
        bool proveMinRep;
        bool proveMaxRep;
        bool proveZeroRep;
        bool proveGraffiti;
        uint256 graffiti;
        uint256 data;
    }

    error AttesterInvalid();
    error InvalidEpochKey();
    error InvalidProof();
    error CallerInvalid();
    error ChainIdNotMatch(uint48 chainId);

    function decodeEpochKeyControl(
        uint256 control
    )
        public
        pure
        returns (
            uint8 nonce,
            uint48 epoch,
            uint160 attesterId,
            bool revealNonce,
            uint48 chainId
        )
    {
        uint8 nonceBits = 8;
        uint8 epochBits = 48;
        uint8 attesterIdBits = 160;
        uint8 revealNonceBit = 1;
        uint8 chainIdBits = 36;
        uint8 accBits = 0;

        nonce = uint8(shift(control, accBits, nonceBits));
        accBits += nonceBits;

        epoch = uint48(shift(control, accBits, epochBits));
        accBits += epochBits;

        attesterId = uint160(shift(control, accBits, attesterIdBits));
        accBits += attesterIdBits;

        revealNonce = bool(shift(control, accBits, revealNonceBit) != 0);
        accBits += revealNonceBit;

        chainId = uint48(shift(control, accBits, chainIdBits));
        return (nonce, epoch, attesterId, revealNonce, chainId);
    }

    function shift(
        uint256 data,
        uint8 shiftBits,
        uint8 variableBits
    ) public pure returns (uint256) {
        return (data >> shiftBits) & ((1 << variableBits) - 1);
    }

    constructor(IVerifier _verifier) {
        verifier = _verifier;
        uint256 id;
        assembly {
            id := chainid()
        }
        chainid = uint48(id);
    }
}
