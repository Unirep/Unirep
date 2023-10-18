// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Unirep} from '../Unirep.sol';
import {IVerifier} from '../interfaces/IVerifier.sol';
import {BaseVerifierHelper} from './BaseVerifierHelper.sol';

/// @title ReputationVerifierHelper
/// @dev https://developer.unirep.io/docs/contracts-api/verifiers/reputation-verifier-helper
contract ReputationVerifierHelper is BaseVerifierHelper {
    constructor(
        Unirep _unirep,
        IVerifier _verifier
    ) BaseVerifierHelper(_unirep, _verifier) {}

    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/reputation-verifier-helper#decodereputationsignals
    /// @param publicSignals The public signals of the snark proof
    /// @return signals The ReputationSignals
    function decodeReputationSignals(
        uint256[] calldata publicSignals
    ) public pure returns (ReputationSignals memory) {
        ReputationSignals memory signals;
        signals.epochKey = publicSignals[0];
        signals.stateTreeRoot = publicSignals[1];
        signals.graffiti = publicSignals[4];
        signals.data = publicSignals[5];
        // now decode the control values
        (
            signals.nonce,
            signals.epoch,
            signals.attesterId,
            signals.revealNonce,
            signals.chainId
        ) = super.decodeEpochKeyControl(publicSignals[2]);

        (
            signals.minRep,
            signals.maxRep,
            signals.proveMinRep,
            signals.proveMaxRep,
            signals.proveZeroRep,
            signals.proveGraffiti
        ) = decodeReputationControl(publicSignals[3]);

        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();

        return signals;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/reputation-verifier-helper#decodereputationcontrol
    /// @param control The encoded control field
    /// @return minRep The minimum rep information in the control field
    /// @return maxRep The maximum rep information in the control field
    /// @return proveMinRep Whether to prove minimum rep information in the control field
    /// @return proveMaxRep Whether to prove maximum rep information in the control field
    /// @return proveZeroRep Whether to prove zero rep information in the control field
    /// @return proveGraffiti Whether to prove graffiti information in the control field
    function decodeReputationControl(
        uint256 control
    )
        public
        pure
        returns (
            uint64 minRep,
            uint64 maxRep,
            bool proveMinRep,
            bool proveMaxRep,
            bool proveZeroRep,
            bool proveGraffiti
        )
    {
        uint8 repBits = 64;
        uint8 oneBit = 1;
        uint8 accBits = 0;
        minRep = uint64(shiftAndParse(control, accBits, repBits));
        accBits += repBits;

        maxRep = uint64(shiftAndParse(control, accBits, repBits));
        accBits += repBits;

        proveMinRep = bool(shiftAndParse(control, accBits, oneBit) != 0);
        accBits += oneBit;

        proveMaxRep = bool(shiftAndParse(control, accBits, oneBit) != 0);
        accBits += oneBit;

        proveZeroRep = bool(shiftAndParse(control, accBits, oneBit) != 0);
        accBits += oneBit;

        proveGraffiti = bool(shiftAndParse(control, accBits, oneBit) != 0);
        accBits += oneBit;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/reputation-verifier-helper#verifyandcheck
    /// @param publicSignals The public signals of the snark proof
    /// @param proof The proof data of the snark proof
    /// @return signals The ReputationSignals
    function verifyAndCheck(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (ReputationSignals memory) {
        ReputationSignals memory signals = decodeReputationSignals(
            publicSignals
        );

        if (!verifier.verifyProof(publicSignals, proof)) revert InvalidProof();

        uint48 epoch = unirep.attesterCurrentEpoch(signals.attesterId);
        if (signals.epoch > epoch) revert InvalidEpoch();

        if (
            !unirep.attesterStateTreeRootExists(
                signals.attesterId,
                signals.epoch,
                signals.stateTreeRoot
            )
        ) revert InvalidStateTreeRoot(signals.stateTreeRoot);

        if (signals.chainId != chainid) revert ChainIdNotMatch(signals.chainId);

        return signals;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/reputation-verifier-helper#verifyandcheckcaller
    /// @param publicSignals The public signals of the snark proof
    /// @param proof The proof data of the snark proof
    /// @return signals The ReputationSignals
    function verifyAndCheckCaller(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (ReputationSignals memory) {
        ReputationSignals memory signals = verifyAndCheck(publicSignals, proof);

        if (signals.attesterId != uint160(msg.sender)) {
            revert CallerInvalid();
        }

        return signals;
    }
}
