// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Unirep} from '../Unirep.sol';
import {ReimburseAttestation} from '../attester-utils/ReimburseAttestation.sol';
import 'hardhat/console.sol';

// interface IVerifier {
//     function verifyProof(
//         uint256[5] calldata publicSignals,
//         uint256[8] calldata proof
//     ) external view returns (bool);
// }

contract ExampleAttester is ReimburseAttestation {
    // IVerifier internal dataVerifier;

    constructor(
        Unirep _unirep,
        uint48 _epochLength
    ) ReimburseAttestation(_unirep, uint160(address(this))) {
        // // set verifier address
        // dataVerifier = _dataVerifier;

        // sign up as an attester
        unirep.attesterSignUp(_epochLength);
    }

    // function addToWhitelist(address[] memory addresses, address owner) public override {

    //     addToWhitelist(addresses, owner);
    // }

    // function userSignUp(uint[] calldata publicSignals, uint[8] calldata proof) public payable override {
    //     userSignUp(publicSignals, proof);
    // }

    function userStateTransition(
        uint[] calldata publicSignals,
        uint[8] calldata proof
    ) public payable virtual override {
        userStateTransition(publicSignals, proof);
    }
}
