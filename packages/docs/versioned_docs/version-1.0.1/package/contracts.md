---
description: >-
  Client library for contracts related functions which are used in UniRep
  protocol.
---

# @unirep/contracts

[![](https://camo.githubusercontent.com/5124fc18e7c4eea90190045bc66eddafb19a7b4d93c696e88c65dc530cec9b02/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f70726f6a6563742d756e697265702d626c75652e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep)[![Github license](https://camo.githubusercontent.com/9dc25f9a3042124b664e5c386b48a35246c09e7fa0e514bf151c2034b183ec62/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f756e697265702f756e697265702e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep/blob/master/LICENSE)[![NPM version](https://camo.githubusercontent.com/32103befc3323b32e0061d6524cfd8d22e5f8048d4e1dde5a8e11a50123a70cf/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f762f40756e697265702f636f6e7472616374733f7374796c653d666c61742d737175617265) ](https://www.npmjs.com/package/@unirep/contracts)[![Downloads](https://camo.githubusercontent.com/85f6bbf84a600d0b04d95c6d875f8090c528203cf31ca65005531aa782930ada/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f646d2f40756e697265702f636f6e7472616374732e7376673f7374796c653d666c61742d737175617265) ](https://npmjs.org/package/@unirep/contracts)[![Linter eslint](https://camo.githubusercontent.com/ed5849d453eb089b4ad8f56f316f492ceef5e7aa5404ee4df4d97ff6cb3f375f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c696e7465722d65736c696e742d3830383066323f7374796c653d666c61742d737175617265266c6f676f3d65736c696e74) ](https://eslint.org/)[![Code style prettier](https://camo.githubusercontent.com/81082ed03d1efb3d135c66d183ce379d0d30a0091d09d472f5e96ab4e2ff4375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f636f64652532307374796c652d70726574746965722d6638626334353f7374796c653d666c61742d737175617265266c6f676f3d7072657474696572)](https://prettier.io/)

## 🛠 Install

### npm or yarn

Install the `@unirep/contracts` package with npm:

```bash
npm i @unirep/contracts
```

or yarn:

```bash
yarn add @unirep/contracts
```

## Deploy Unirep contract

Deploy Unirep smart contract with default config:

```typescript
import { ethers } from 'ethers'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Unirep } from '@unirep/contracts'

const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'
const deployer = new ethers.Wallet(privateKey, provider);

const unirepContract: Unirep = await deployUnirep(deployer)
```

### Get unirep contract with address

```typescript
import { ethers } from 'ethers'
import { getUnirepContract, Unirep } from '@unirep/contracts'

const address = '0x....'
const provider = 'YOUR/ETH/PROVIDER'

const unirepContract: Unirep = getUnirepContract(address, provider)
```

## 🧑🏻‍💻 Call Unirep contract with `ethers`

```typescript
import { ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { getUnirepContract, Unirep } from '@unirep/contracts'

const address = '0x....'
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'

// connect a signer
const signer = new ethers.Wallet(privateKey, provider)
const unirepContract: Unirep = getUnirepContract(address, signer)

// user sign up
const id = new ZkIdentity()
const tx = await unirepContract['userSignUp(uint256)'](id.genIdentityCommitment())

// attester sign up
const tx = await unirepContract.attesterSignUp()
```

## 🙋🏻‍♂️ Call Unirep contract in DApps

```solidity
import { Unirep } from '@unirep/contracts/Unirep.sol';

contract YourContract {
    Unirep public unirep;

    uint256 internal _attesterId;

    // Initialize contract with a deployed
    constructor(Unirep _unirepContract) {
        // Set the unirep contract address
        unirep = _unirepContract;
    }

    // Relay Users sign up in Unirep
    function signUp(uint256 idCommitment) external {
        unirep.userSignUp(idCommitment);
    }

    // Sign up this contract as an attester
    function signUpContract() external {
        unirep.attesterSignUp();
        _attesterId = unirep.attesters(address(this));
    }

    // And get attestation from the contract
    function submitAttestation(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // Step 1. verify epoch key proof
        bool valid = unirep.verifyEpochKeyValidity(publicSignals, proof);
        require(valid);

        // Step 2. init attestation
        // create an attestation which sends 5 positive Rep to the epochKey
        Unirep.Attestation memory attestation;
        attestation.attesterId = _attesterId;
        attestation.posRep = 5;

        // Step 3. send attestation
        unirep.submitAttestation{ value: unirep.attestingFee() }(
            attestation,
            publicSignals[0] // epoch key
        );
    }
}
```

## 📚 Other usages

### Proofs

**An example of epoch key proof**
**1. Generate an epoch key proof structure**
```typescript
import { Circuit } from '@unirep/circuits'
import { EpochKeyProof } from '@unirep/contracts'

// see @unirep/circuits to know how to generate a prover and circuitInputs
const prover = {
    ...
}
const circuitInputs = {
    ...
}

const { publicSignals, proof } = await prover.genProofAndPublicSignals(
    Circuit.verifyEpochKey,
    circuitInputs
)

const epkProof = new EpochKeyProof(
    publicSignals,
    proof,
    prover
)
```
**2. Get data from epoch key proof structure**
```typescript
const epoch = epkProof.epoch
const epochKey = epkProof.epochKey
const globalStateTree = epkProof.globalStateTree
```

**3. Verify the epoch key proof**
```typescript
const isValid = await epkProof.verify()
```



### Attestation
**An example of constructing an Attestation object**

```typescript
import { Attestation } from '@unirep/contracts'

const attestation = new Attestation(
    attesterID,
    positiveReputation,
    negativeReputation,
    graffiti,
    signUpFlag
)
const hash = attestation.hash()
```

### Event/ Attestation event

The event enum is used to help with determining the type of the event, which are as the same definition in `IUnirep.sol`
