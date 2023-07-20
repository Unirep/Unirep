# Unirep procotol package

Client library for protocol related functions which are used in UniRep protocol.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@unirep/core">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/core?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@unirep/core">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@unirep/core.svg?style=flat-square" />
    </a>
    <a href="https://eslint.org/">
        <img alt="Linter eslint" src="https://img.shields.io/badge/linter-eslint-8080f2?style=flat-square&logo=eslint" />
    </a>
    <a href="https://prettier.io/">
        <img alt="Code style prettier" src="https://img.shields.io/badge/code%20style-prettier-f8bc45?style=flat-square&logo=prettier" />
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

Install the `@unirep/core` package with npm:

```bash
npm i @unirep/core
```

or yarn:

```bash
yarn add @unirep/core
```

## 📔 Usage

### Synchronizer ⏲

**Construct a synchronizer**
```typescript
import { Synchronizer } from '@unirep/core'

const address = '0x....'
const provider = 'YOUR/ETH/PROVIDER'

// 1. initialize a synchronizer
const synchronizer = new Synchronizer({
    unirepAddress: address,
    provider,
})
// 2. start listening to unriep contract events
await synchronizer.start()
// 3. wait until the latest block is processed
await synchronizer.waitForSync()
// 4. stop the synchronizer deamon
synchronizer.stop()
```

**Example: use the synchronizer to generate unirep state**
```typescript
const epoch = 0
const attesterId = 'ATTESTER/ADDRESS' // the msg.sender signs up through `attesterSignUp()`
// e.g.
// const attester = new ethers.Wallet(key, provider)
// const epochLength = 300
// const tx = await unirepContract.connect(attester).attesterSignUp(epochLength)
// await tx.wait()
const stateTree = await synchronizer.genStateTree(epoch, attesterId)
```

### UserState 👤

**Construct a user state**
```typescript
import { Identity } from '@semaphore-protocol/identity'
import { UserState } from '@unirep/core'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

// random generate a user identity
const identity = new Identity()

// 1. initialize a user state object
const userState = new UserState({
    unirepAddress: address,
    provider,
    prover: defaultProver,
    id: identity
})
// or through a synchronicr
// const userState = new UserState({synchronizer, id: identity})
// 2. start listening to unriep contract events
await userState.start()
// 3. wait until the latest block is processed
await userState.waitForSync()
// 4. stop the synchronizer deamon
userState.stop()
```

**Example: use the user state to generate proofs**
```typescript
// 1. generate a signup proof of the user
const { publicSignals, proof } = await userState.genUserSignUpProof({ attesterId: attester.address })

// 2. submit the signup proof through the attester
const tx = await unirepContract
    .connect(attester)
    .userSignUp(publicSignals, proof)
await tx.wait()
```

## 🙌🏻 Join our community
- Discord server: <a href="https://discord.gg/VzMMDJmYc5"><img src="https://img.shields.io/discord/931582072152281188?label=Discord&style=flat-square&logo=discord"></a>
- Twitter account: <a href="https://twitter.com/UniRep_Protocol"><img src="https://img.shields.io/twitter/follow/UniRep_Protocol?style=flat-square&logo=twitter"></a>
- Telegram group: <a href="https://t.me/unirep"><img src="https://img.shields.io/badge/telegram-@unirep-blue.svg?style=flat-square&logo=telegram"></a>

## <img height="24" src="https://ethereum.org/static/a183661dd70e0e5c70689a0ec95ef0ba/13c43/eth-diamond-purple.png"> Privacy & Scaling Explorations

This project is supported by [Privacy & Scaling Explorations](https://github.com/privacy-scaling-explorations) in Ethereum Foundation.
See more projects on: https://appliedzkp.org/.
