// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Unirep} from '../Unirep.sol';
import {IVerifier} from '../interfaces/IVerifier.sol';
import {BaseVerifierHelper} from './BaseVerifierHelper.sol';

/// @title EpochKeyVerifierHelper
/// @dev https://developer.unirep.io/docs/contracts-api/verifiers/epoch-key-verifier-helper
contract EpochKeyVerifierHelper is BaseVerifierHelper {
    constructor(
        Unirep _unirep,
        IVerifier _verifier
    ) BaseVerifierHelper(_unirep, _verifier) {}

    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/epoch-key-verifier-helper#decodeepochkeysignals
    /// @param publicSignals The public signals of the snark proof
    /// @return signals The EpochKeySignals
    function decodeEpochKeySignals(
        uint256[] calldata publicSignals
    ) public pure returns (EpochKeySignals memory) {
        EpochKeySignals memory signals;
        signals.epochKey = publicSignals[0];
        signals.stateTreeRoot = publicSignals[1];
        signals.data = publicSignals[3];
        // now decode the control values
        (
            signals.nonce,
            signals.epoch,
            signals.attesterId,
            signals.revealNonce,
            signals.chainId
        ) = super.decodeEpochKeyControl(publicSignals[2]);

        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();

        return signals;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/epoch-key-verifier-helper#verifyandcheck
    /// @param publicSignals The public signals of the snark proof
    /// @param proof The proof data of the snark proof
    /// @return signals The EpochKeySignals
    function verifyAndCheck(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (EpochKeySignals memory) {
        EpochKeySignals memory signals = decodeEpochKeySignals(publicSignals);

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

    /// @dev https://developer.unirep.io/docs/contracts-api/verifiers/epoch-key-verifier-helper#verifyandcheckcaller
    /// @param publicSignals The public signals of the snark proof
    /// @param proof The proof data of the snark proof
    /// @return signals The EpochKeySignals
    function verifyAndCheckCaller(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (EpochKeySignals memory) {
        EpochKeySignals memory signals = verifyAndCheck(publicSignals, proof);

        if (signals.attesterId != uint160(msg.sender)) {
            revert CallerInvalid();
        }

        return signals;
    }
}
