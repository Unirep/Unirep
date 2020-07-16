pragma solidity ^0.5.0;

contract EpochKeyValidityVerifier {
    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public view returns (bool) {
        // Use a[0] to determine whether verification succeed or fail to faciliate testing
        if(a[0] == 1) {
            return true;
        } else {
            return false;
        }
    }
}