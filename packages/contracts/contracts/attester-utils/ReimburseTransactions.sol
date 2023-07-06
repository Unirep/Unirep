// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Unirep} from '../Unirep.sol';
/**
 * @title ReimburseTransactions
 * @dev An attester can inherit this contract to hold budget and allow the callers of the contract (attester app users) to be reimbersed for transactions.
 	This would make the publicly funding operation of attesters more modular and transparent.
	e.g. An attester could directly get funded from a gitcoin round for its operation.
 */
contract ReimburseTransactions {
    bool public acceptDonations;
    bool public acceptReReimburseUST;

    mapping(address => bool) public whitelist;

    Unirep public unirep;

    // id of the attester this budget contract is deployed for
    uint160 public attesterId;

    enum TxType {
        Signup,
        UST
    }

    event Reimbursed(address indexed recipient, uint amount, TxType txType);
    event FundsReceived(address sender, uint amount);

    constructor(Unirep _unirep, uint160 _attesterId) {
        unirep = _unirep;
        attesterId = _attesterId;
        acceptDonations = true;
        acceptReReimburseUST = true;
    }

    /**
     * @dev Add users to whitelist
     */
    function addToWhitelist(
        address[] calldata addresses
    ) public virtual {
        for (uint i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
    }

    /**
     * @dev Remove users from whitelist
     */
    function removeFromWhitelist(
        address[] calldata toRemoveAddresses
    ) external {
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
            msg.sender == address(attesterId),
            'Only this budget contract itself can call this function'
        );
        acceptDonations = !acceptDonations;
    }

    function userSignUp(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public payable virtual {
        require(whitelist[msg.sender], 'This user is not in the whitelist');
        uint256 attesterSignalIndex = 2;

        // check that we're doing a userSignUP for the attester this budget contract is deployed for
        require(publicSignals[attesterSignalIndex] == attesterId);

        // start measuring gas
        uint startGas = gasleft();

        // this is guaranteed not to re-enter if it's configured correctly
        unirep.userSignUp(publicSignals, proof);

        // use BASEFEE here to prevent large gasprice values
        uint reimbursement = (startGas - gasleft()) * block.basefee;

        require(
            address(this).balance >= reimbursement,
            'Not enough budget in the contract'
        );

        (bool sent, ) = payable(msg.sender).call{value: reimbursement}('');
        // The gas cost will be deducted from the external account that initiated the transaction.

        require(sent, 'Failed to send Ether');

        emit Reimbursed(msg.sender, reimbursement, TxType.Signup);
    }

    function userStateTransition(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public payable virtual {
        require(whitelist[msg.sender], 'This user is not in the whitelist');

        uint256 attesterSignalIndex = unirep.numEpochKeyNoncePerEpoch();

        // check that we're doing a UST for the attester this budget contract is deployed for
        require(publicSignals[attesterSignalIndex] == attesterId);

        // start measuring gas
        uint startGas = gasleft();

        // this is guaranteed not to re-enter if it's configured correctly
        unirep.userStateTransition(publicSignals, proof);

        // using basefee to prevent large gasprice values
        uint txCost = (startGas - gasleft()) * block.basefee;

        payable(msg.sender).transfer(txCost);

        emit Reimbursed(msg.sender, txCost, TxType.UST);
    }
}
