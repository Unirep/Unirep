# Unirep contracts package

Client library for contracts related functions which are used in unirep protocol.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@unirep/contracts">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/contracts?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@unirep/contracts">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@unirep/contracts.svg?style=flat-square" />
    </a>
    <a href="https://eslint.org/">
        <img alt="Linter eslint" src="https://img.shields.io/badge/linter-eslint-8080f2?style=flat-square&logo=eslint" />
    </a>
    <a href="https://prettier.io/">
        <img alt="Code style prettier" src="https://img.shields.io/badge/code%20style-prettier-f8bc45?style=flat-square&logo=prettier" />
    </a>
    <a href="https://contracts-coverage.unirep.io/">
        <img alt="Coverage report" src="https://contracts-coverage.unirep.io/badge.svg" />
    </a>
</p>

<div align="center">
    <h4>
        <a href="https://discord.gg/VzMMDJmYc5">
            🤖 Chat &amp; Support
        </a>
    </h4>
</div>

---

## 💡 About Unirep
**UniRep** is a *private* and *non-repudiable* **data system**. Users can receive attestations from attesters, and voluntarily prove facts about their data without revealing the data itself. Moreover, users cannot refuse to receive attestations from an attester.

## 📘 Documentation

Read the [medium article](https://medium.com/privacy-scaling-explorations/unirep-a-private-and-non-repudiable-reputation-system-7fb5c6478549) to know more about the concept of Unirep protocol.
For more information, refer to the [documentation](https://developer.unirep.io/)

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

## 👩🏻‍⚕️ Haven't deployed a contract yet?

### Get circuit keys from one of the following methods

**🍀 Solution 1. Download circuit keys from server**

Get circuits files from [key server](https://developer.unirep.io/docs/testnet-deployment#keys).

**🍀 Solution 2. Access the keys from node_modules**

By default, The `zksnarkBuild` directory will be found in `node_modules/@unirep/circuits/circuits/zksnarkBuild/`

### Compile contracts from the keys

**Step 1. Set the `zksnarkBuild` path in [buildVerifier.ts](./scripts/buildVerifiers.ts)**

**Step 2. Run compile command**

```bash
yarn contracts compile
```

By default, The `artifacts` directory will be found in `./packages/contracts/build`

## 🙆🏻‍♀️ Unirep contract has been compiled

### Deploy Unirep contract

Deploy Unirep smart contract with default [config](../circuits/config/index.ts):

```typescript
import { ethers } from 'ethers'
import { Unirep } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'

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
import { getUnirepContract, Unirep } from '@unirep/contracts'

const address = '0x....'
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'

// connect a signer
const signer = new ethers.Wallet(privateKey, provider)
const unirepContract: Unirep = getUnirepContract(address, signer)

// attester sign up
const epochLength = 300 // 300 seconds
const tx = await unirepContract.attesterSignUp(epochLength)
await tx.wait()
```

## 🙋🏻‍♂️ Call Unirep contract in DApps

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import { Unirep } from "@unirep/contracts/Unirep.sol";
import { IVerifier } from "@unirep/contracts/interfaces/IVerifier.sol";

contract UnirepApp {
    Unirep public unirep;
    IVerifier public dataVerifier;

    constructor(
        Unirep _unirep,
        IVerifier _dataVerifier,
        uint48 _epochLength
    ) {
        // set unirep address
        unirep = _unirep;

        // set verifier address
        dataVerifier = _dataVerifier;

        // sign up as an attester
        unirep.attesterSignUp(_epochLength);
    }

    // sign up users in this app
    function userSignUp(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        unirep.userSignUp(publicSignals, proof);
    }

    // submit attestations
    function submitAttestation(
        uint256 epochKey,
        uint48 targetEpoch,
        uint256 fieldIndex,
        uint256 val
    ) public {
        unirep.attest(
            epochKey,
            targetEpoch,
            fieldIndex,
            val
        );
    }
}
```

## 🙌🏻 Join our community
- Discord server: <a href="https://discord.gg/VzMMDJmYc5"><img src="https://img.shields.io/discord/931582072152281188?label=Discord&style=flat-square&logo=discord"></a>
- Twitter account: <a href="https://twitter.com/UniRep_Protocol"><img src="https://img.shields.io/twitter/follow/UniRep_Protocol?style=flat-square&logo=twitter"></a>
- Telegram group: <a href="https://t.me/unirep"><img src="https://img.shields.io/badge/telegram-@unirep-blue.svg?style=flat-square&logo=telegram"></a>

## <img height="24" src="https://ethereum.org/static/a183661dd70e0e5c70689a0ec95ef0ba/13c43/eth-diamond-purple.png"> Privacy & Scaling Explorations

This project is supported by [Privacy & Scaling Explorations](https://github.com/privacy-scaling-explorations) in Ethereum Foundation.
See more projects on: https://appliedzkp.org/.
