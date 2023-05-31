// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVerifier} from '../interfaces/IVerifier.sol';
import {BaseVerifierHelper} from './BaseVerifierHelper.sol';

contract EpochKeyLiteVerifierHelper is BaseVerifierHelper {
    constructor(IVerifier _verifier) BaseVerifierHelper(_verifier) {}

    function decodeEpochKeyLiteSignals(
        uint256[] calldata publicSignals
    ) public pure returns (EpochKeySignals memory) {
        EpochKeySignals memory signals;
        signals.epochKey = publicSignals[1];
        signals.data = publicSignals[2];
        // now decode the control values
        (
            signals.revealNonce,
            signals.attesterId,
            signals.epoch,
            signals.nonce
        ) = super.decodeEpochKeyControl(publicSignals[0]);

        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();

        return signals;
    }

    function verifyAndCheck(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (EpochKeySignals memory) {
        EpochKeySignals memory signals = decodeEpochKeyLiteSignals(
            publicSignals
        );
        bool valid = verifier.verifyProof(publicSignals, proof);

        if (!valid) revert InvalidProof();

        return signals;
    }

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
