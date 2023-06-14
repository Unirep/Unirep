// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Unirep} from '../Unirep.sol';
import {ReimburseAttestation} from '../attester-utils/ReimburseAttestation.sol';

contract ExampleAttester is ReimburseAttestation {
    constructor(
        Unirep _unirep,
        uint48 _epochLength
    ) ReimburseAttestation(_unirep, uint160(address(this))) {
        // sign up as an attester
        unirep.attesterSignUp(_epochLength);
    }
}
