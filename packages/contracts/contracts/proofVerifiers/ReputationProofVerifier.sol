// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVerifier} from '../interfaces/IVerifier.sol';
import {BaseProofVerifier} from './BaseProofVerifier.sol';

contract ReputationProofVerifier is BaseProofVerifier {
    constructor(IVerifier _verifier) BaseProofVerifier(_verifier) {}

    function decodeReputationSignals(
        uint256[] calldata publicSignals
    ) public pure returns (ReputationSignals memory) {
        ReputationSignals memory signals;
        signals.epochKey = publicSignals[0];
        signals.stateTreeRoot = publicSignals[1];
        signals.graffitiPreImage = publicSignals[4];
        // now decode the control values
        (
            signals.revealNonce,
            signals.attesterId,
            signals.epoch,
            signals.nonce
        ) = super.decodeEpochKeyControl(publicSignals[2]);

        (
            signals.minRep,
            signals.maxRep,
            signals.proveMinRep,
            signals.proveMaxRep,
            signals.proveZeroRep,
            signals.proveGraffiti
        ) = decodeReputationControl(publicSignals[3]);
        return signals;
    }

    function decodeReputationControl(
        uint256 control
    )
        public
        pure
        returns (
            uint256 minRep,
            uint256 maxRep,
            uint256 proveMinRep,
            uint256 proveMaxRep,
            uint256 proveZeroRep,
            uint256 proveGraffiti
        )
    {
        minRep = control & ((1 << 64) - 1);
        maxRep = (control >> 64) & ((1 << 64) - 1);
        proveMinRep = (control >> 128) & 1;
        proveMaxRep = (control >> 129) & 1;
        proveZeroRep = (control >> 130) & 1;
        proveGraffiti = (control >> 131) & 1;
        return (
            minRep,
            maxRep,
            proveMinRep,
            proveMaxRep,
            proveZeroRep,
            proveGraffiti
        );
    }

    function verifyAndCheck(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (ReputationSignals memory) {
        ReputationSignals memory signals = decodeReputationSignals(
            publicSignals
        );

        bool valid = verifier.verifyProof(publicSignals, proof);

        if (!valid) revert InvalidProof();
        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();

        return signals;
    }

    function verifyAndCheckCaller(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public view returns (ReputationSignals memory) {
        ReputationSignals memory signals = decodeReputationSignals(
            publicSignals
        );

        require(
            signals.attesterId == uint160(msg.sender),
            'attesterId is not caller'
        );

        return verifyAndCheck(publicSignals, proof);
    }
}
