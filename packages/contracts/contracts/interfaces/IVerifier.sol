pragma solidity ^0.8.0;

// Verifier interface
// Verifier should follow IVerifer interface. 
interface IVerifier {
    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) external view returns (bool);
     
}