---
description: >-
  Client library for protocol related functions which are used in UniRep
  protocol.
---

# @unirep/core

[![](https://camo.githubusercontent.com/5124fc18e7c4eea90190045bc66eddafb19a7b4d93c696e88c65dc530cec9b02/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f70726f6a6563742d756e697265702d626c75652e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep)[![Github license](https://camo.githubusercontent.com/9dc25f9a3042124b664e5c386b48a35246c09e7fa0e514bf151c2034b183ec62/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f756e697265702f756e697265702e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep/blob/master/LICENSE)[![NPM version](https://camo.githubusercontent.com/a9357846d4cdecf057e033e035c6a6aed5ba9922fab7be8f518ddd32bfd3d60d/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f762f40756e697265702f636f72653f7374796c653d666c61742d737175617265) ](https://www.npmjs.com/package/@unirep/core)[![Downloads](https://camo.githubusercontent.com/4e94eef5b9322b15298059cc382cc810a49e8189bf5f3e1a8374280a7542cdda/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f646d2f40756e697265702f636f72652e7376673f7374796c653d666c61742d737175617265) ](https://npmjs.org/package/@unirep/core)[![Linter eslint](https://camo.githubusercontent.com/ed5849d453eb089b4ad8f56f316f492ceef5e7aa5404ee4df4d97ff6cb3f375f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c696e7465722d65736c696e742d3830383066323f7374796c653d666c61742d737175617265266c6f676f3d65736c696e74) ](https://eslint.org/)[![Code style prettier](https://camo.githubusercontent.com/81082ed03d1efb3d135c66d183ce379d0d30a0091d09d472f5e96ab4e2ff4375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f636f64652532307374796c652d70726574746965722d6638626334353f7374796c653d666c61742d737175617265266c6f676f3d7072657474696572)](https://prettier.io/)

### 🛠 Install

#### npm or yarn

Install the `@unirep/core` package with npm:

```bash
npm i @unirep/core
```

or yarn:

```bash
yarn add @unirep/core
```

### 📔 Usage

#### Synchronizer ⏲

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
const globalStateTree = await synchronizer.genGSTree(epoch)
```

#### UserState 👤

**Construct a user state**

```typescript
import { ZkIdentity } from '@unirep/crypto'
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

#### Utils 🧳

**Example: Compute an epoch key**

```typescript
import { ZkIdentity } from '@unirep/crypto'
import { genEpochKey } from '@unirep/core'

const identity = new ZkIdentity()
const epoch = 1
const nonce = 0
const epochTreeDepth = 64

const epk = genEpochKey(
    identity.identityNullifier, 
    epoch, 
    nonce, 
    epochTreeDepth
)
```
