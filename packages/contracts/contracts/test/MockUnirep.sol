// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VerifySignature} from '../libraries/VerifySignature.sol';
import {IUnirep} from '../interfaces/IUnirep.sol';

contract MockUnirep is IUnirep, VerifySignature {
    // Attester id == address
    mapping(uint160 => AttesterData) attesters;
    uint8 public immutable numEpochKeyNoncePerEpoch;

    constructor() {
        numEpochKeyNoncePerEpoch = 2;
    }

    function userSignUp(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {}

    function userStateTransition(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {}

    receive() external payable {}

    function _attesterSignUp(address attesterId, uint48 epochLength) private {
        AttesterData storage attester = attesters[uint160(attesterId)];
        if (attester.startTimestamp != 0)
            revert AttesterAlreadySignUp(uint160(attesterId));
        attester.startTimestamp = uint48(block.timestamp);

        // set the epoch length
        attester.epochLength = epochLength;

        emit AttesterSignedUp(
            uint160(attesterId),
            epochLength,
            attester.startTimestamp
        );
    }

    function attesterSignUp(uint48 epochLength) public {
        _attesterSignUp(msg.sender, epochLength);
    }

    function attesterCurrentEpoch(
        uint160 attesterId
    ) public view returns (uint48) {
        uint48 timestamp = attesters[attesterId].startTimestamp;
        uint48 epochLength = attesters[attesterId].epochLength;
        if (timestamp == 0) revert AttesterNotSignUp(attesterId);
        return (uint48(block.timestamp) - timestamp) / epochLength;
    }
}
