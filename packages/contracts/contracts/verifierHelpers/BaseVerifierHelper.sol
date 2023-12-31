// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Unirep} from '../Unirep.sol';
import {IVerifier} from '../interfaces/IVerifier.sol';

contract BaseVerifierHelper {
    Unirep unirep;
    IVerifier verifier;

    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public immutable chainid;

    struct EpochKeySignals {
        uint256 epochKey;
        uint256 stateTreeRoot;
        uint256 data;
        uint160 attesterId;
        uint48 epoch;
        uint48 chainId;
        uint8 nonce;
        bool revealNonce;
    }

    struct ReputationSignals {
        uint256 epochKey;
        uint256 stateTreeRoot;
        uint256 minRep;
        uint256 maxRep;
        uint256 graffiti;
        uint256 data;
        uint160 attesterId;
        uint48 epoch;
        uint48 chainId;
        uint8 nonce;
        bool revealNonce;
        bool proveMinRep;
        bool proveMaxRep;
        bool proveZeroRep;
        bool proveGraffiti;
    }

    struct SpendReputationSignals {
        uint256 spenderData;
        uint256 receiverData;
        uint256 epochTreeElements;
        uint256 epochTreeIndices;
        uint256 spendAmount;
        uint256 epochTreeRoot;
        uint256 updatedEpochTreeRoot;
        uint160 attesterId;
        uint160 spenderIdentitySecret;
        uint160 receiverIdentitySecret;
        uint48 epoch;
        uint48 chainId;
        uint8 nonce;
        bool revealNonce;
    }

    error AttesterInvalid();
    error InvalidEpochKey();
    error InvalidProof();
    error InvalidEpoch();
    error InvalidStateTreeRoot(uint256 stateTreeRoot);
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
        uint16 nonceBits = 8;
        uint16 epochBits = 48;
        uint16 attesterIdBits = 160;
        uint16 revealNonceBit = 1;
        uint16 chainIdBits = 36;
        uint16 accBits = 0;

        nonce = uint8(shiftAndParse(control, accBits, nonceBits));
        accBits += nonceBits;

        epoch = uint48(shiftAndParse(control, accBits, epochBits));
        accBits += epochBits;

        attesterId = uint160(shiftAndParse(control, accBits, attesterIdBits));
        accBits += attesterIdBits;

        revealNonce = bool(
            shiftAndParse(control, accBits, revealNonceBit) != 0
        );
        accBits += revealNonceBit;

        chainId = uint48(shiftAndParse(control, accBits, chainIdBits));
    }

    function shiftAndParse(
        uint256 data,
        uint16 shiftBits,
        uint16 variableBits
    ) public pure returns (uint256) {
        return (data >> shiftBits) & ((1 << variableBits) - 1);
    }

    function decodeSpendReputationControl(
        uint256 control
    )
        public
        pure
        returns (
            uint160 spenderIdentitySecret,
            uint160 receiverIdentitySecret,
            uint256 spendAmount
        )
    {
        uint16 spenderIdentitySecretBits = 160;
        uint16 receiverIdentitySecretBits = 160;
        uint16 spendAmountBits = 256;
        uint16 accBits = 0;

        spenderIdentitySecret = uint160(
            shiftAndParse(control, accBits, spenderIdentitySecretBits)
        );
        accBits += spenderIdentitySecretBits;

        receiverIdentitySecret = uint160(
            shiftAndParse(control, accBits, receiverIdentitySecretBits)
        );
        accBits += receiverIdentitySecretBits;

        spendAmount = uint256(shiftAndParse(control, accBits, spendAmountBits));
        accBits += spendAmountBits;
    }

    constructor(Unirep _unirep, IVerifier _verifier) {
        unirep = _unirep;
        verifier = _verifier;
        uint256 id;
        assembly {
            id := chainid()
        }
        chainid = uint48(id);
    }
}
