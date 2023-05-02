// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVerifier} from '../interfaces/IVerifier.sol';
import {BaseProofVerifier} from './BaseProofVerifier.sol';

contract EpochKeyProofVerifier is BaseProofVerifier {
    constructor(IVerifier _verifier) BaseProofVerifier(_verifier) {}

    function decodeEpochKeySignals(
        uint256[] calldata publicSignals
    ) public pure returns (EpochKeySignals memory) {
        EpochKeySignals memory signals;
        signals.epochKey = publicSignals[0];
        signals.stateTreeRoot = publicSignals[1];
        signals.data = publicSignals[3];
        // now decode the control values
        (
            signals.revealNonce,
            signals.attesterId,
            signals.epoch,
            signals.nonce
        ) = super.decodeEpochKeyControl(publicSignals[2]);
        return signals;
    }

    function verifyAndCheck(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (EpochKeySignals memory) {
        EpochKeySignals memory signals = decodeEpochKeySignals(publicSignals);

        bool valid = verifier.verifyProof(publicSignals, proof);

        if (!valid) revert InvalidProof();
        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();

        return signals;
    }

    function verifyAndCheckCaller(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (EpochKeySignals memory) {
        EpochKeySignals memory signals = decodeEpochKeySignals(publicSignals);

        require(
            signals.attesterId == uint160(msg.sender),
            'attesterId is not caller'
        );

        return verifyAndCheck(publicSignals, proof);
    }
}
