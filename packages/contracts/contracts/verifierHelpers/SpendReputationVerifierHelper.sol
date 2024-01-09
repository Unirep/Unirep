// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Unirep} from '../Unirep.sol';
import {IVerifier} from '../interfaces/IVerifier.sol';
import {BaseVerifierHelper} from './BaseVerifierHelper.sol';

contract SpendReputationVerifierHelper is BaseVerifierHelper {
    constructor(
        Unirep _unirep,
        IVerifier _verifier
    ) BaseVerifierHelper(_unirep, _verifier) {}

    function decodeSpendReputationSignals(
        uint256[] calldata publicSignals
    ) public pure returns (SpendReputationSignals memory) {
        SpendReputationSignals memory signals;
        signals.spenderData = publicSignals[0];
        signals.receiverData = publicSignals[1];
        signals.epochTreeRoot = publicSignals[2];
        signals.updatedEpochTreeRoot = publicSignals[5];
        (
            signals.nonce,
            signals.epoch,
            signals.attesterId,
            signals.revealNonce,
            signals.chainId
        ) = super.decodeEpochKeyControl(publicSignals[3]);
        (
            signals.spenderIdentitySecret,
            signals.receiverIdentitySecret,
            signals.spendAmount
        ) = super.decodeSpendReputationControl(publicSignals[4]);

        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();

        return signals;
    }

    function verifyAndCheck(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (SpendReputationSignals memory) {
        SpendReputationSignals memory signals = decodeSpendReputationSignals(
            publicSignals
        );

        bool valid = verifier.verifyProof(publicSignals, proof);

        if (!valid) revert InvalidProof();

        return signals;
    }

    function verifyAndCheckCaller(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (SpendReputationSignals memory) {
        SpendReputationSignals memory signals = verifyAndCheck(
            publicSignals,
            proof
        );

        if (signals.attesterId != uint160(msg.sender)) {
            revert CallerInvalid();
        }

        return signals;
    }
}
