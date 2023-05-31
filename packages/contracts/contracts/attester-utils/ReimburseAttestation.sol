// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Unirep} from '../Unirep.sol';
import 'hardhat/console.sol';

/**
 * @title ReimburseAttestation
 * @dev An attester can inherit this contract to hold budget and allow the callers of the contract (attester app users) to be reimbersed for attestations.
 	This would make the publicly funding operation of attesters more modular and transparent.
	e.g. An attester could directly get funded from a gitcoin round for its operation.
 */
contract ReimburseAttestation {
    bool public accpetDonations;

    mapping(address => bool) public whitelist;

    Unirep public unirep;

    // id of the attester this budget contract is deployed for
    uint256 public attesterId;

    event Reimbursed(address indexed recepient, uint amount, string txType);
    event FundsReceived(address sender, uint amount);

    constructor(Unirep _unirep, uint256 _attesterId) {
        unirep = _unirep;
        attesterId = _attesterId;
        accpetDonations = true;
    }

    /**
     * @dev Add users to whitelist
     */
    function addToWhitelist(
        address[] memory addresses,
        address owner
    ) public virtual {
        require(
            msg.sender == owner,
            'Only owner contract itself can call addToWhitelist()'
        );
        for (uint i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
        console.log('addresses[0] ', addresses[0]);
    }

    /**
     * @dev Remove users from whitelist
     */
    function removeFromWhitelist(
        address[] calldata toRemoveAddresses,
        address owner
    ) external {
        require(
            msg.sender == owner,
            'Only owner contract itself can callremoveFromWhitelist()'
        );
        for (uint i = 0; i < toRemoveAddresses.length; i++) {
            delete whitelist[toRemoveAddresses[i]];
        }
    }

    /**
     * @dev The contract should hold the funds and accept funds from anyone.
     */
    function donate() public payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // Fallback function to accept ether sent directly to the contract
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    /**
     * @dev Restrict/allow the contract to receive more donations.

     */
    function toggleAcceptingDonations() public {
        require(
            msg.sender == address(this),
            'Only this budget contract itself can call this function'
        );
        accpetDonations = !accpetDonations;
    }

    function userSignUp(
        uint256[] calldata publicSignals,
        uint[8] calldata proof
    ) public payable virtual {
        require(whitelist[msg.sender], 'This user is not in the whitelist');

        uint256 attesterSignalIndex = unirep.numEpochKeyNoncePerEpoch();

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

    function userStateTransition(
        uint[] calldata publicSignals,
        uint[8] calldata proof
    ) public payable virtual {
        require(whitelist[msg.sender], 'This user is not in the whitelist');

        uint attesterSignalIndex = unirep.numEpochKeyNoncePerEpoch();
        console.log('2');

        // check that we're doing a UST for the attester this budget contract is deployed for
        require(publicSignals[attesterSignalIndex] == attesterId);
        console.log(attesterSignalIndex);
        console.log(attesterId);
        console.log(publicSignals[0]);
        console.log(publicSignals[1]);
        console.log(publicSignals[2]);
        console.log(publicSignals[3]);
        console.log('3');

        // start measuring gas
        uint startGas = gasleft();
        console.log('4');

        // this is guaranteed not to re-enter if it's configured correctly
        unirep.userStateTransition(publicSignals, proof);

        console.log('5');

        // using basefee to prevent large gasprice values
        uint txCost = (startGas - gasleft()) * block.basefee;
        console.log('6');

        payable(msg.sender).transfer(txCost);
        console.log('6');

        emit Reimbursed(msg.sender, txCost, 'UST');
    }
}
