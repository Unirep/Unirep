# Unirep utils package

Client library for cryptography related functions which are used in unirep protocol.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@unirep/utils">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/utils?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@unirep/utils">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@unirep/utils.svg?style=flat-square" />
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

Install the `@unirep/utils` package with npm:

```bash
npm i @unirep/utils
```

or yarn:

```bash
yarn add @unirep/utils
```

## 📔 Usage

### ZkIdentity

**Generate a random ZkIdentity**
```typescript
import { ZkIdentity } from '@unirep/utils'
const identity = new ZkIdentity()
```

**Generate identity commitment**
```typescript
const commitment = identity.genIdentityCommitment()
```

**Get identity nullifier**
```typescript
const commitment = identity.identityNullifier
```

**get identity trapdoor**
```typescript
const commitment = identity.trapdoor
```
**Serialize/ unserialize identity**

```typescript
import { Strategy } from '@unirep/utils'
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
import { IncrementalMerkleTree } from '@unirep/utils'

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
import { SparseMerkleTree } from '@unirep/utils'

const depth = 4
// initialize incremental merkle tree with depth 4
const zeroHash = 0
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
const leafKey = Bigint(1)
const proof = tree.createProof(leafKey)
```

**Verify merkle proof**
```typescript
const isValid = tree.verifyProof(proof)
```

### Crypto utils

**genRandomSalt**
```typescript
import { genRandomSalt } from '@unirep/utils'

// generate random bigint
const salt = genRandomSalt()
```

**hash5**

```typescript
import { hash5 } from '@unirep/utils'

// poseidon hash 5 bigint elements
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
import { hashOne } from '@unirep/utils'

// poseidon hash 1 bigint elements
const value = genRandomSalt()
const hashOneValue = hashOne(value)
```
**hashLeftRight**
```typescript
import { hashLeftRight } from '@unirep/utils'

// poseidon hash 2 bigint elements
const leftValue = genRandomSalt()
const rightValue = genRandomSalt()
const hash = hashLeftRight(leftValue, rightValue)
```
**stringifyBigInts/unstringifyBigInts**
```typescript
const values = {
    input1: genRandomSalt(),
    input2: genRandomSalt(),
    input3: genRandomSalt(),
}
// stringify bigint elements with stringifyBigInts function
const stringifiedValues = stringifyBigInts(values)
// it can be recoverd by unstringifyBigInts function
const unstringifiedValues = unstringifyBigInts(stringifiedValues)
```