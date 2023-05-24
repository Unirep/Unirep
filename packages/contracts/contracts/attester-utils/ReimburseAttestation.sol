// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Unirep } from "../Unirep.sol";

/**
 * @title ReimburseAttestation
 * @dev An attester can inherit this contract to hold budget and allow the callers of the contract (attester app users) to be reimbersed for attestations.
 	This would make the publicly funding operation of attesters more modular and transparent.
	e.g. An attester could directly get funded from a gitcoin round for its operation.
 */
contract ReimburseAttestation {

	uint public fund;
    bool public accpetDonations;

	mapping(address => bool) public whitelist;

    Unirep public unirep;

    // id of the attester this budget contract is deployed for
    uint256 immutable public attesterId;

    event Reimbursed(address indexed recepient, uint amount, string txType);

    constructor (
        Unirep _unirep,
        uint256 _attesterId
    ) {
        unirep = _unirep;
        attesterId = _attesterId;
        accpetDonations = true;
    }

    /**
     * @dev Add users to whitelist
     */
    function addToWhitelist(address[] calldata addresses) external {
        for (uint i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
    }

    /**
     * @dev Remove users from whitelist
     */
    function removeFromWhitelist(address[] calldata toRemoveAddresses) external {
        for (uint i = 0; i < toRemoveAddresses.length; i++) {
            delete whitelist[toRemoveAddresses[i]];
        }
    }

    /**
     * @dev The contract should hold the funds and accept funds from anyone.
     */
    function donate() public payable {
        fund += msg.value;
    }

    /**
     * @dev Restrict/allow the contract to receive more donations.

     */
    function toggleAcceptingDonations() public {
        require(msg.sender == address(this), "Only this budget contract itself can call this function");
        accpetDonations = !accpetDonations;
    }

    function userStateTransition(uint[] calldata publicSignals, uint[8] calldata proof) public {
        require(whitelist[msg.sender], "This user is not in the whitelist");

        uint attesterSignalIndex = 3 + unirep.numEpochKeyNoncePerEpoch();

        // check that we're doing a UST for the attester this budget contract is deployed for
        require(publicSignals[attesterSignalIndex] == attesterId);

        // start measuring gas
        uint startGas = gasleft();

        // this is guaranteed not to re-enter if it's configured correctly
        unirep.userStateTransition(publicSignals, proof);

        // using basefee to prevent large gasprice values
        uint txCost = (startGas - gasleft()) * block.basefee;

        payable(msg.sender).transfer(txCost);

        emit Reimbursed(msg.sender, txCost, 'UST');
    }

	function userSignUp(uint[] calldata publicSignals, uint[8] calldata proof) public payable {
        require(whitelist[msg.sender], "This user is not in the whitelist");

        uint attesterSignalIndex = 3 + unirep.numEpochKeyNoncePerEpoch();

        // check that we're doing a userSignUP for the attester this budget contract is deployed for
        require(publicSignals[attesterSignalIndex] == attesterId);

        // start measuring gas
        uint startGas = gasleft();

        // this is guaranteed not to re-enter if it's configured correctly
        unirep.userSignUp(publicSignals, proof);

        // use BASEFEE here to prevent large gasprice values
        uint txCost = (startGas - gasleft()) * block.basefee;

        payable(msg.sender).transfer(txCost);

        emit Reimbursed(msg.sender, txCost, 'userSignUp');

    }

}