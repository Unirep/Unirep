pragma abicoder v2;
pragma solidity 0.7.6;

import { Hasher } from "./Hasher.sol";

contract DomainObjs is Hasher {
    struct StateLeaf {
        uint256 identityCommitment;
        uint256 userStateRoot;
        uint256 positiveKarma;
        uint256 negativeKarma;
    }

    function hashStateLeaf(StateLeaf memory _stateLeaf) public pure returns (uint256) {
        uint256[5] memory hashElements;
        hashElements[0] = _stateLeaf.identityCommitment;
        hashElements[1] = _stateLeaf.userStateRoot;
        hashElements[2] = _stateLeaf.positiveKarma;
        hashElements[3] = _stateLeaf.negativeKarma;
        return hash5(hashElements);
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
        // Whether or not to overwrite the graffiti in the user’s state
        bool overwriteGraffiti;
    }

    struct Karma {
        // Total positive karma
        uint256 positiveKarma;
        // Total negative karma
        uint256 negativeKarma;
    }

    function hashAttestation(Attestation memory attestation) internal returns (uint256) {
        uint256 overwriteGraffiti = attestation.overwriteGraffiti ? 1 : 0;
        uint256[5] memory attestationData;
        attestationData[0] = attestation.attesterId;
        attestationData[1] = attestation.posRep;
        attestationData[2] = attestation.negRep;
        attestationData[3] = attestation.graffiti;
        attestationData[4] = overwriteGraffiti;
        return hash5(attestationData);
    }
}