---

title: Getting Started with ts/js
---

# 🚀 Getting Started with TypeScript/JavaScript

We provide the following npm packages for developers to build with TypeScript or JavaScript:

| Package | Version | Description |
|:--:|:--:|--|
| [`@unirep/core`](https://github.com/Unirep/Unirep/tree/main/packages/core) | <a href="https://www.npmjs.com/package/@unirep/core"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/core?color=%230004&style=flat-square" /></a> | Unirep protocol-related functions |
| [`@unirep/contracts`](https://github.com/Unirep/Unirep/tree/main/packages/contracts) | <a href="https://www.npmjs.com/package/@unirep/contracts"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/contracts?color=%230004&style=flat-square" /></a> | Unirep smart contracts, ZKP verifiers and contract-related functions |
| [`@unirep/circuits`](https://github.com/Unirep/Unirep/tree/main/packages/circuits) | <a href="https://www.npmjs.com/package/@unirep/circuits"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/circuits?color=%230004&style=flat-square" /></a> | Unirep Circom circuits and circuit-related functions |
| [`@unirep/utils`](https://github.com/Unirep/Unirep/tree/main/packages/utils) | <a href="https://www.npmjs.com/package/@unirep/utils"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/utils?color=%230004&style=flat-square" /></a> | Utilities used in Unirep protocol |

## 💻 Installation

You can simply install [`@unirep/core`](https://www.npmjs.com/package/@unirep/core) to use all of these dependencies.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="yarn" label="Yarn" default>


    yarn add @unirep/core


  </TabItem>
  <TabItem value="npm" label="Npm">


    npm i @unirep/core


  </TabItem>
</Tabs>

## 🛠️ Deploy or connect to a Unirep smart contract

### Deploy a `Unirep.sol`

If there is no `Unirep.sol` deployed in a testnet or a local blockchain environment (e.g. [Hardhat](https://hardhat.org) node), you can run the following scripts:

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript', value: 'typescript'},
        {label: 'Javascript', value: 'javascript'},
    ]}>
<TabItem value="typescript">
```

```ts
import { ethers } from 'ethers'
import { deployUnirep } from '@unirep/contracts/deploy'

// connect to a wallet
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'
const deployer = new ethers.Wallet(privateKey, provider)

// deploy unirep contract
const unirepContract = await deployUnirep(deployer)
```

```mdx-code-block
  </TabItem>
  <TabItem value="javascript">
```

```js
const ethers = require('ethers')
const { deployUnirep } = require('@unirep/contracts/deploy')

// connect to a wallet
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'
const deployer = new ethers.Wallet(privateKey, provider)

// deploy unirep contract
const unirepContract = await deployUnirep(deployer)
```

```mdx-code-block
  </TabItem>
</Tabs>
```

### Connect to a deployed `Unirep.sol`

If a `Unirep.sol` is deployed, you can connect the smart contract with the function:

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript', value: 'typescript'},
        {label: 'Javascript', value: 'javascript'},
    ]}>
<TabItem value="typescript">
```

```ts
import { getUnirepContract, Unirep } from '@unirep/contracts'

const address = '0x...'
const provider = 'YOUR/ETH/PROVIDER'

const unirepContract: Unirep = getUnirepContract(address, provider)
```

```mdx-code-block
  </TabItem>
  <TabItem value="javascript">
```

```js
const { getUnirepContract } = require('@unirep/contracts')

const address = '0x...'
const provider = 'YOUR/ETH/PROVIDER'

const unirepContract = getUnirepContract(address, provider)
```

```mdx-code-block
  </TabItem>
</Tabs>
```

:::info
See [Testnet Deployment](../testnet-deployment.mdx) to see the currently deployed `Unirep.sol` contract.
:::

**The following actions are initiated by either an attester or a user.**<br/>
Read the section [users and attesters](protocol/users-and-attesters.md) to learn more.

## 🤖 Attester sign up

The app builder must sign up with `Unirep.sol` as an attester. There are two ways to sign up:
1. [Attester signs up with a wallet](#1-attester-sign-up-with-a-wallet-)
2. [Attester signs up with a smart contract](#2-attester-sign-up-with-a-smart-contract-)

### 1. Attester sign up with a wallet 👛

Connect a wallet with a private key and a provider, and then call [`attesterSignUp`](contracts-api/unirep-sol.md#attestersignup) in `Unirep.sol`.

```ts
// deploy or connect to a unirep smart contract
const unirepContract = getUnirepContract(address, provider)
// attester wallet
const attester = new ethers.Wallet(privateKey, provider)
// define epoch length
const epochLength = 300 // 300 seconds
// send transaction
const tx = await unirepContract.attesterSignUp(epochLength)
await tx.wait()
```

:::info
See [Define epoch length](getting-started/create-unirep-app.mdx#define-epoch-length) for more information.
:::

The `msg.sender` will be recorded as an attester ID in `Unirep.sol`. The attester should connect to this wallet to help users sign up and send attestations to users.

### 2. Attester sign up with a smart contract 📄

The app builder can also use a smart contract as an attester. For example:

```sol title="App.sol"
pragma solidity ^0.8.0;
import {Unirep} from '@unirep/contracts/Unirep.sol';

contract App {
    Unirep public unirep;
    constructor(
        Unirep _unirep,
        uint48 _epochLength
    ) {
        // set UniRep address
        unirep = _unirep;
        // sign up as an attester
        unirep.attesterSignUp(_epochLength);
    }
}
```

`Unirep.sol` will record the `msg.sender`, which is the address of `App.sol`, as the attester ID. Now the attester can define the user signup and attestation logic in `App.sol`.

## 👤 User sign up

TThe attester can now start signing up users. Users of this application should provide a [signup proof](circuits-api/circuits.md#signup-proof) which includes:
1. Proving the user owns a [Semaphore identity](https://semaphore.appliedzkp.org/)
2. Proving the user has initialized [data](protocol/data.md)
3. Proving the user wants to sign up to this attester (proving attester ID)

### User generates sign up proof
The user will generate the signup proof on the client side:

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript', value: 'typescript'},
        {label: 'Javascript', value: 'javascript'},
    ]}>
<TabItem value="typescript">
```

```ts
import { UserState } from '@unirep/core'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Identity } from "@semaphore-protocol/identity"

// Semaphore Identity
const id = new Identity()
// generate user state
const userState = new UserState({
  prover: defaultProver, // a circuit prover
  unirepAddress: unirepContract.address,
  provider, // an ethers.js provider
  id,
})

// start and sync
await userState.start()
await userState.waitForSync()

// generate signup proof
const { proof, publicSignals } = await userState.genUserSignUpProof()
```

```mdx-code-block
  </TabItem>
  <TabItem value="javascript">
```

```js
const { UserState } = require('@unirep/core')
const { defaultProver } = require('@unirep/circuits/provers/defaultProver')
const { Identity } = require("@semaphore-protocol/identity")

// Semaphore Identity
const id = new Identity()
// generate user state
const userState = new UserState({
  prover: defaultProver, // a circuit prover
  unirepAddress: unirepContract.address,
  provider, // an ethers.js provider
  id,
})

// start and sync
await userState.start()
await userState.waitForSync()

// generate signup proof
const { proof, publicSignals } = await userState.genUserSignUpProof()
```

```mdx-code-block
  </TabItem>
</Tabs>
```

:::info
See [`UserState`](core-api/user-state.md) for more information.
:::

### Attester submits sign up proof

The attester will submit this proof by calling the [`userSignUp`](contracts-api/unirep-sol.md#usersignup) function on `Unirep.sol`.

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript/Javascript', value: 'typescript'},
        {label: 'Solidity', value: 'solidity'},
    ]}>
<TabItem value="typescript">
```

```ts title="userSignUp.ts/userSignUp.js"
// attester sends the tx
const tx = await unirepContract
    .connect(attester)
    .userSignUp(publicSignals, proof)
await tx.wait()
```

```mdx-code-block
  </TabItem>
  <TabItem value="solidity">
```

```sol title="App.sol"
function userSignUp(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) public {
    unirep.userSignUp(publicSignals, proof);
}
```

```mdx-code-block
  </TabItem>
</Tabs>
```

:::tip
A user can check if they have signed up successfully with `userState`:
```ts
// let userState synchronize through the latest block
await userState.waitForSync()
console.log(await userState.hasSignedUp()) // true
```
See [`waitForSync`](core-api/synchronizer.md#waitforsync) for more information.
:::

## 📮 Attestation

Users must provide [epoch keys](protocol/epoch-key.md) to receive [data](protocol/data.md) from attesters, similar to how Ethereum users provide address to receive ETH. An [attestation](protocol/attestation.md) is the data an attester gives to a specified epoch key.

### User generates epoch keys

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript', value: 'typescript'},
        {label: 'Javascript', value: 'javascript'},
    ]}>
<TabItem value="typescript">
```

```ts title="epochKey.ts"
import { genEpochKey } from '@unirep/utils'
// get epoch from contract
const epoch = await unirepContract.attesterCurrentEpoch(attester.address)
// define nonce
const nonce = 0 // it could be 0 to (NUM_EPOCH_KEY_NONCE - 1) per user
// generate an epoch key
const epochKey = genEpochKey(
    identity.secret,
    BigInt(attester.address),
    epoch,
    nonce
)
```

```mdx-code-block
  </TabItem>
  <TabItem value="javascript">
```

```js title="epochKey.js"
const { genEpochKey } = require('@unirep/utils')
// get epoch from contract
const epoch = await unirepContract.attesterCurrentEpoch(attester.address)
// define nonce
const nonce = 0 // it could be 0 to (NUM_EPOCH_KEY_NONCE - 1) per user
// generate an epoch key
const epochKey = genEpochKey(
    identity.secret,
    BigInt(attester.address),
    epoch,
    nonce
)
```

```mdx-code-block
  </TabItem>
</Tabs>
```

:::info
See [`genEpochKey`](utils-api/hashes.md#genepochkey) for more information.
:::


### Attester submits the transaction

The attester will submit attestations by calling the [`attest`](contracts-api/unirep-sol.md#attest) function on `Unirep.sol`.<br/>
To add to a user's data:
```
data[0] += 5
```
the attester will define:
```ts
const fieldIndex = 0
const change = 5
```

:::caution
There are **addition data fields** and **replacement data fields**. Please make sure the index of the data is correct.

For example, if `SUM_FIELD_COUNT = 4` then the `data[4]` will be *replaced* by the `change` but not added together.

See [Data](protocol/data.md) for more information.
:::


```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript/Javascript', value: 'typescript'},
        {label: 'Solidity', value: 'solidity'},
    ]}>
<TabItem value="typescript">
```

```ts title="attest.ts/attest.js"
// attester sends the tx
// the data field that the attester chooses to change
const fieldIndex = 0
// the amount of the change
const change = 5
const tx = await unirepContract
    .connect(attester)
    .attest(
        epochKey,
        epoch,
        fieldIndex,
        change
    )
await tx.wait()
```

```mdx-code-block
  </TabItem>
  <TabItem value="solidity">
```

```sol title="App.sol"
// attester sends the tx
function attest(
    uint256 epochKey
) public {
    // get epoch from contract
    uint48 epoch = unirep.attesterCurrentEpoch(uint160(address(this)));
    // the data field that the attester chooses to change
    uint fieldIndex = 0;
    // the amount of the change
    uint change = 5 ;
    unirep.attest(
        epochKey,
        epoch,
        fieldIndex,
        change
    );
}
```

```mdx-code-block
  </TabItem>
</Tabs>
```

:::caution
To verify an epoch key on-chain, see [Verify epoch key on-chain](./create-unirep-app.mdx#verify-epoch-key).
:::

## ⏱️ User state transition

After an epoch ends, the user will perform [user state transition](protocol/user-state-transition.md) to finalize the state in the previous epoch, and use a new state to receive more data in a new epoch.

The user state transition proof must be built by the user because only the user holds the Semaphore identity secret key.

### User generates user state transition proof

```ts
// call to make sure the state is updated
await userState.waitForSync()
// generate the user state transition proof
const { proof, publicSignals } = await userState.genUserStateTransitionProof()
```

:::info
See [`genUserStateTransitionProof`](core-api/user-state.md#genuserstatetransitionproof) for more information.
:::

### A transition proof can be relayed

The user state transition proof should be submitted to `Unirep.sol` to update the user state on-chain but it does not have to be the attester that sends the transaction.

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript/Javascript', value: 'typescript'},
        {label: 'Solidity', value: 'solidity'},
    ]}>
<TabItem value="typescript">
```

```ts title="transition.ts/transition.js"
// sends the tx
// it doesn't need to be the attester
const tx = await unirepContract
    .connect(relayer)
    .userStateTransition(
        publicSignals,
        proof
    )
await tx.wait()
```

```mdx-code-block
  </TabItem>
  <TabItem value="solidity">
```

```sol title="Relayer.sol"
// sends the tx
// it doesn't need to be the attester
function transition(
    uint[] memory publicSignals,
    uint[8] memory proof
) public {
    unirep.userStateTransition(
        publicSignals,
        proof
    );
}
```

```mdx-code-block
  </TabItem>
</Tabs>
```

:::info
See [`userStateTransition`](contracts-api/unirep-sol.md#userstatetransition) for more information.
:::

## 🔐 Prove data

After a user state transition, a user can prove the data they received in previous epochs.

### User generates data proof

```ts title="proveData.ts/proveData.js"
// call to make sure the state is updated
await userState.waitForSync()
// the data that the user wants to prove
// If the user has 5, they can choose to prove they have more than 3
const repProof = await userState.genProveReputationProof({
    minRep: 3
})
// check if proof is valid
console.log(await repProof.verify()) // true

// we will use { publicSignals, proof} later
const { publicSignals, proof } = repProof
```

In this example, we define `data[0]` as positive reputation and `data[1]` as negative reputation. <br/>
Proving `minRep = 3` is a claim that `(data[0] - data[1]) >= 3`.

In the [above attestation](#attester-submits-the-transaction), the user's `data[0]` increased by `5` and `data[1]` was not changed.

Therefore in this case `data[0] - data[1]` = `5`.

Use [`getProvableData`](core-api/user-state.md#getprovabledata) to know the data that a user can prove.

```ts
const data = await userState.getProvableData()
```

:::info
See [`reputationProof`](circuits-api/circuits.md#prove-reputation-proof) for more information.
:::

### Other users and attesters verify the proof

:::info
See [`ReputationVerifierHelper`](contracts-api/verifiers/reputation-verifier-helper.md) to learn how to deploy and use the `repVerifier`.
:::

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript/Javascript', value: 'typescript'},
        {label: 'Solidity', value: 'solidity'},
    ]}>
<TabItem value="typescript">
```

```ts title="transition.ts/transition.js"
// sends the tx
// it doesn't need to be the attester
const tx = await unirepContract
    .connect(relayer)
    .verifyReputationProof(
        publicSignals,
        proof
    )
await tx.wait()
```

```mdx-code-block
  </TabItem>
  <TabItem value="solidity">
```

```sol title="Relayer.sol"
// sends the tx
// it doesn't need to be the attester
function verifyProof(
    uint[] memory publicSignals,
    uint[8] memory proof
) public {
    repVerifier.verifyAndCheckCaller(
        publicSignals,
        proof
    );
}
```

```mdx-code-block
  </TabItem>
</Tabs>
```

Now, start building your own application with UniRep. 🚀
