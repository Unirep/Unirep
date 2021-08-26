// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity 0.7.6;

import { Hasher } from "./Hasher.sol";

contract DomainObjs is Hasher {
    struct StateLeaf {
        uint256 identityCommitment;
        uint256 userStateRoot;
    }

    function hashStateLeaf(StateLeaf memory _stateLeaf) public pure returns (uint256) {
        return hashLeftRight(_stateLeaf.identityCommitment, _stateLeaf.userStateRoot);
    }

    struct Attestation {
        // The attester’s ID
        uint256 attesterId;
        // Positive reputation
        uint256 posRep;
        // Negative reputation
        uint256 negRep;
        // A hash of an arbitary string
        uint256 graffiti;
    }

    function hashAttestation(Attestation memory attestation) internal pure returns (uint256) {
        uint256[5] memory attestationData;
        attestationData[0] = attestation.attesterId;
        attestationData[1] = attestation.posRep;
        attestationData[2] = attestation.negRep;
        attestationData[3] = attestation.graffiti;
        attestationData[4] = 0;
        return hash5(attestationData);
    }
}