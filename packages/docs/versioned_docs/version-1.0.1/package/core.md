---
description: >-
  Client library for protocol related functions which are used in UniRep
  protocol.
---

# @unirep/core

[![](https://camo.githubusercontent.com/5124fc18e7c4eea90190045bc66eddafb19a7b4d93c696e88c65dc530cec9b02/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f70726f6a6563742d756e697265702d626c75652e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep)[![Github license](https://camo.githubusercontent.com/9dc25f9a3042124b664e5c386b48a35246c09e7fa0e514bf151c2034b183ec62/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f756e697265702f756e697265702e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep/blob/master/LICENSE)[![NPM version](https://camo.githubusercontent.com/a9357846d4cdecf057e033e035c6a6aed5ba9922fab7be8f518ddd32bfd3d60d/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f762f40756e697265702f636f72653f7374796c653d666c61742d737175617265) ](https://www.npmjs.com/package/@unirep/core)[![Downloads](https://camo.githubusercontent.com/4e94eef5b9322b15298059cc382cc810a49e8189bf5f3e1a8374280a7542cdda/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f646d2f40756e697265702f636f72652e7376673f7374796c653d666c61742d737175617265) ](https://npmjs.org/package/@unirep/core)[![Linter eslint](https://camo.githubusercontent.com/ed5849d453eb089b4ad8f56f316f492ceef5e7aa5404ee4df4d97ff6cb3f375f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c696e7465722d65736c696e742d3830383066323f7374796c653d666c61742d737175617265266c6f676f3d65736c696e74) ](https://eslint.org/)[![Code style prettier](https://camo.githubusercontent.com/81082ed03d1efb3d135c66d183ce379d0d30a0091d09d472f5e96ab4e2ff4375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f636f64652532307374796c652d70726574746965722d6638626334353f7374796c653d666c61742d737175617265266c6f676f3d7072657474696572)](https://prettier.io/)

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

**Construct a Unirep state**
```typescript
import { Synchronizer } from '@unirep/core'

const genUnirepState = async (
    provider: ethers.providers.Provider,
    address: string,
    _db?: DB
) => {
    const unirepContract: Unirep = await getUnirepContract(address, provider)
    let synchronizer: Synchronizer
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    synchronizer = new Synchronizer(db, defaultProver, unirepContract)
    await synchronizer.start()
    await synchronizer.waitForSync()
    return synchronizer
}
```

**Example: use the synchronizer to generate unirep state**
```typescript
const epoch = 1
const globalStateTree = await synchronizer.genGSTree(epoch)
```

### UserState 👤

**Construct a Unirep user state**
```typescript
import { UserState } from '@unirep/core'

const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    _db?: DB
) => {
    const unirepContract: Unirep = getUnirepContract(address, provider)
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState(
        db,
        defaultProver,
        unirepContract,
        userIdentity
    )
    await userState.start()
    await userState.waitForSync()
    return userState
}
```

**Example: use the user state to generate proofs**
```typescript
const nonce = 1
const epochKeyProof = await userState.genVerifyEpochKeyProof(nonce)
// Then the attester can call `submitAttestation` on Unirep contract
// to send attestation to the epoch key
```

### Utils 🧳
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