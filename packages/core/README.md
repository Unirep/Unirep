# Unirep procotol package

Client library for protocol related functions which are used in unirep protocol.

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
import { Synchronizer, schema } from '@unirep/core'
import { getUnirepContract, Unirep } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'

// connect a unirep contract with the address and a provider
const unirepContract: Unirep = getUnirepContract(address, provider)
// initialize a database
const db: DB = await SQLiteConnector.create(schema, ':memory:')

// 1. initialize a synchronizer
const synchronizer = new Synchronizer(db, provider, unirepContract)
// 2. start listening to unriep contract events
await synchronizer.start()
// 3. wait until the latest block is processed
await synchronizer.waitForSync()
```

**Example: use the synchronizer to generate unirep state**
```typescript
const epoch = 1
const stateTree = await synchronizer.genStateTree(epoch)
```

### UserState 👤

**Construct a user state**
```typescript
import { ZkIdentity } from '@unirep/utils'
import { Synchronizer, schema } from '@unirep/core'
import { getUnirepContract, Unirep } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'

// random generate a user identity
const identity = new ZkIdentity()
// connect a unirep contract with the address and a provider
const unirepContract: Unirep = getUnirepContract(address, provider)
// initialize a database
const db: DB = await SQLiteConnector.create(schema, ':memory:')

// 1. initialize a user state object
const userState = new UserState(
    db,
    provider,
    unirepContract,
    identity
)
// 2. start listening to unriep contract events
await userState.start()
// 3. wait until the latest block is processed
await userState.waitForSync()
```

**Example: use the user state to generate proofs**
```typescript
const nonce = 1
const epochKeyProof = await userState.genVerifyEpochKeyProof(nonce)

// 1. submit the epoch key proof to smart contract
const tx = await unirepContract.submitEpochKeyProof(
    epochKeyProof.publicSignals,
    epochKeyProof.proof
)

// 2. get the index of the epoch key proof
const proofHash = epochKeyProof.hash()
const index = await unirepContract.getProofIndex(proofHash)

// Then the attester can call `submitAttestation` on Unirep contract
// to send attestation to the epoch key with a proof index
```

### Utils 🧳
**Example: Compute an epoch key**
```typescript
import { ZkIdentity, genEpochKey } from '@unirep/utils'
import { genEpochKey } from '@unirep/core'

const identity = new ZkIdentity()
const epoch = 1
const nonce = 0
const epochTreeDepth = 64

const epk = genEpochKey(
    identity.secretHash,
    epoch,
    nonce,
    epochTreeDepth
)
```
