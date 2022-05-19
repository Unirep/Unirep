/*
 * Hasher object to abstract out hashing logic
 * to be shared between multiple files
 *
 * This file is part of maci
 */

pragma solidity ^0.8.0;

import {UnirepTypes} from '../types/UnirepTypes.sol';

contract Hasher is UnirepTypes {
    function hashEpochKeyProof(EpochKeyProof memory input)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    input.globalStateTree,
                    input.epoch,
                    input.epochKey,
                    input.proof
                )
            );
    }

    function hashReputationProof(ReputationProof memory input)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    input.repNullifiers,
                    input.epoch,
                    input.epochKey,
                    input.globalStateTree,
                    input.attesterId,
                    input.proveReputationAmount,
                    input.minRep,
                    input.proveGraffiti,
                    input.graffitiPreImage,
                    input.proof
                )
            );
    }

    function hashSignUpProof(SignUpProof memory input)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    input.epoch,
                    input.epochKey,
                    input.globalStateTree,
                    input.attesterId,
                    input.userHasSignedUp,
                    input.proof
                )
            );
    }

    function hashStartTransitionProof(
        uint256 blindedUserState,
        uint256 blindedHashChain,
        uint256 globalStateTree,
        uint256[8] memory proof
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    blindedUserState,
                    blindedHashChain,
                    globalStateTree,
                    proof
                )
            );
    }

    function hashProcessAttestationsProof(
        uint256 outputBlindedUserState,
        uint256 outputBlindedHashChain,
        uint256 inputBlindedUserState,
        uint256[8] calldata proof
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    proof
                )
            );
    }

    function hashUserStateTransitionProof(UserTransitionProof memory input)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    input.newGlobalStateTreeLeaf,
                    input.epkNullifiers,
                    input.transitionFromEpoch,
                    input.blindedUserStates,
                    input.fromGlobalStateTree,
                    input.blindedHashChains,
                    input.fromEpochTree,
                    input.proof
                )
            );
    }
}
