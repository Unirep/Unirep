---
description: >-
  Client library for cryptography related functions which are used in UniRep
  protocol.
---

# @unirep/crypto

[![](https://camo.githubusercontent.com/5124fc18e7c4eea90190045bc66eddafb19a7b4d93c696e88c65dc530cec9b02/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f70726f6a6563742d756e697265702d626c75652e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep)[![Github license](https://camo.githubusercontent.com/9dc25f9a3042124b664e5c386b48a35246c09e7fa0e514bf151c2034b183ec62/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f756e697265702f756e697265702e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep/blob/master/LICENSE)[![NPM version](https://camo.githubusercontent.com/4774ba9193678c694b6cfaeb67630a07cac1188c9052630db4654234a920366c/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f762f40756e697265702f63727970746f3f7374796c653d666c61742d737175617265) ](https://www.npmjs.com/package/@unirep/crypto)[![Downloads](https://camo.githubusercontent.com/1e833aa109c88580fa56d15c0270422a6bf401040513530fa83b91f497868e11/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f646d2f40756e697265702f63727970746f2e7376673f7374796c653d666c61742d737175617265) ](https://npmjs.org/package/@unirep/crypto)[![Linter eslint](https://camo.githubusercontent.com/ed5849d453eb089b4ad8f56f316f492ceef5e7aa5404ee4df4d97ff6cb3f375f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c696e7465722d65736c696e742d3830383066323f7374796c653d666c61742d737175617265266c6f676f3d65736c696e74) ](https://eslint.org/)[![Code style prettier](https://camo.githubusercontent.com/81082ed03d1efb3d135c66d183ce379d0d30a0091d09d472f5e96ab4e2ff4375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f636f64652532307374796c652d70726574746965722d6638626334353f7374796c653d666c61742d737175617265266c6f676f3d7072657474696572)](https://prettier.io/)

## 🛠 Install

### npm or yarn

Install the `@unirep/crypto` package with npm:

```bash
npm i @unirep/crypto
```

or yarn:

```bash
yarn add @unirep/crypto
```

## 📔 Usage

### ZkIdentity

**Generate a random ZkIdentity**
```typescript
import { ZkIdentity } from '@unirep/crypto'
const identity = new ZkIdentity()
```

**Generate identity commitment**
```typescript
const commitment = identity.genIdentityCommitment()
```

**Get identity nullifier**
```typescript
const idNullifier = identity.identityNullifier
```

**get identity trapdoor**
```typescript
const idTrapdoor = identity.trapdoor
```
**Serialize/ unserialize identity**

```typescript
import { Strategy } from '@unirep/crypto'
// serialize identity
const serializedIdentity = identity.serializeIdentity()
// unserialize identity
const unserializedIdentity = new ZkIdentity(
    Strategy.SERIALIZED,
    serializedIdentity
)
```

### IncrementalMerkleTree

**Create a IncrementalMerkleTree**
```typescript
import { IncrementalMerkleTree } from '@unirep/crypto'

const depth = 4
// initialize incremental merkle tree with depth 4
const tree = new IncrementalMerkleTree(depth)
```

**Get tree root**
```typescript
const root = tree.root
```

**Insert leaf**
```typescript
const leaf = 1
tree.insert(leaf)
```

**Generate merkle proof**
```typescript
const index = 0
const proof = tree.createProof(index)
```

**Verify merkle proof**
```typescript
const isValid = tree.verifyProof(proof)
```

### SparseMerkleTree

**Create a SparseMerkleTree**
```typescript
import { SparseMerkleTree } from '@unirep/crypto'

const depth = 4
// initialize incremental merkle tree with depth 4
const zeroHash = BigInt(0)
// initialize sparse merkle tree with depth 4 and zeroHash 0
const tree = new SparseMerkleTree(
    depth, 
    zeroHash
)
```

**Get tree root**
```typescript
const root = tree.root
```

**Update leaf**
```typescript
const leafKey = BigInt(3)
const leafValue = BigInt(4)
tree.update(leafKey, leafValue)
```

**Generate merkle proof**
```typescript
const leafKey = BigInt(1)
const proof = tree.createProof(leafKey)
```

**Verify merkle proof**
```typescript
const isValid = tree.verifyProof(leafKey, proof)
```

### Crypto utils

**genRandomSalt**
```typescript
import { genRandomSalt } from '@unirep/crypto'

// generate random BigInt
const salt = genRandomSalt()
```

**hash5**

```typescript
import { hash5 } from '@unirep/crypto'

// poseidon hash 5 BigInt elements
const values = [
    genRandomSalt(),
    genRandomSalt(),
    genRandomSalt(),
    genRandomSalt(),
    genRandomSalt(),
]
const hash5Value = hash5(values)
```
**hashOne**
```typescript
import { hashOne } from '@unirep/crypto'

// poseidon hash 1 BigInt elements
const value = genRandomSalt()
const hashOneValue = hashOne(value)
```
**hashLeftRight**
```typescript
import { hashLeftRight } from '@unirep/crypto'

// poseidon hash 2 BigInt elements
const leftValue = genRandomSalt()
const rightValue = genRandomSalt()
const hash = hashLeftRight(leftValue, rightValue)
```
**stringifyBigInts/unstringifyBigInts**
```typescript
import { stringifyBigInts, unstringifyBigInts } from '@unirep/crypto'

const values = {
    input1: BigInt(1),
    input2: BigInt(2),
    input3: BigInt(3),
}
// stringify BigInt elements with stringifyBigInts function
const stringifiedValues = stringifyBigInts(values)
// it can be recoverd by unstringifyBigInts function
const unstringifiedValues = unstringifyBigInts(stringifiedValues)
```