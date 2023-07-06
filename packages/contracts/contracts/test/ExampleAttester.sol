// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Unirep} from '../Unirep.sol';
import {ReimburseTransactions} from '../attester-utils/ReimburseTransactions.sol';

contract ExampleAttester is ReimburseTransactions {
    constructor(
        Unirep _unirep,
        uint48 _epochLength
    ) ReimburseTransactions(_unirep, uint160(address(this))) {
        // sign up as an attester
        unirep.attesterSignUp(_epochLength);
    }
}
