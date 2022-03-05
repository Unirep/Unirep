/*
 * Hasher object to abstract out hashing logic
 * to be shared between multiple files
 *
 * This file is part of maci
 */

pragma solidity 0.8.0;

import { UnirepObjs } from "./UnirepObjs.sol";

contract Hasher is UnirepObjs {

    function hashEpochKeyProof(EpochKeyProof memory _input) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _input.globalStateTree, 
            _input.epoch, 
            _input.epochKey, 
            _input.proof
        ));
    }

    function hashReputationProof(ReputationProof memory _input) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _input.repNullifiers, 
            _input.epoch, 
            _input.epochKey, 
            _input.globalStateTree, 
            _input.attesterId, 
            _input.proveReputationAmount,
            _input.minRep, 
            _input.proveGraffiti, 
            _input.graffitiPreImage, 
            _input.proof
        ));
    }

    function hashSignUpProof(SignUpProof memory _input) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _input.epoch, 
            _input.epochKey, 
            _input.globalStateTree, 
            _input.attesterId,
            _input.userHasSignedUp,
            _input.proof
        ));
    }

    function hashStartTransitionProof(
        uint256 _blindedUserState, 
        uint256 _blindedHashChain, 
        uint256 _globalStateTree, 
        uint256[8] memory _proof
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _blindedUserState, 
            _blindedHashChain, 
            _globalStateTree, 
            _proof
        ));
    }
    
    function hashProcessAttestationsProof(
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256 _inputBlindedUserState,
        uint256[8] calldata _proof
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _outputBlindedUserState, 
            _outputBlindedHashChain, 
            _inputBlindedUserState, 
            _proof
        ));
    }

    function hashUserStateTransitionProof(UserTransitionProof memory _input) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _input.newGlobalStateTreeLeaf, 
            _input.epkNullifiers, 
            _input.transitionFromEpoch, 
            _input.blindedUserStates, 
            _input.fromGlobalStateTree, 
            _input.blindedHashChains, 
            _input.fromEpochTree, 
            _input.proof
        ));
    }
}