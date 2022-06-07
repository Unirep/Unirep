# Unirep crypto package

Client library for cryptography related functions which are used in unirep protocol.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@unirep/crypto">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/crypto?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@unirep/crypto">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@unirep/crypto.svg?style=flat-square" />
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

```typescript
import { ZkIdentity, Strategy } from '@unirep/crypto'

// generate new random ZkIdentity
const identity = new ZkIdentity()
// generate id commitment
const commitment = identity.genIdentityCommitment()
// get identity nullifier
const idNullifier = identity.identityNullifier
// get identity trapdoor
const idTrapdoor = identity.trapdoor

// serialize identity
const serializedIdentity = identity.serializeIdentity()
// unserialize identity
const unserializedIdentity = new ZkIdentity(
    Strategy.SERIALIZED,
    serializedIdentity
)
```

### IncrementalMerkleTree

```typescript
import { IncrementalMerkleTree } from '@unirep/crypto'

const depth = 4
// initialize incremental merkle tree with depth 4
const tree = new IncrementalMerkleTree(depth)
// get tree root
const root = tree.root

// insert leaf
const leaf = 1
tree.insert(leaf)

// gen merkle proof
const index = 0
const proof = tree.createProof(index)

// verify merkle proof
const isValid = tree.verifyProof(proof)
```

### SparseMerkleTree

```typescript
import keyv from 'keyv'
import { SparseMerkleTree } from '@unirep/crypto'

const depth = 4
const zeroHash = 0
// initialize sparse merkle tree with depth 4 and zeroHash 0
const tree = new SparseMerkleTree(new Keyv(), depth, zeroHash)
// get tree root
const root = tree.root

// update leaf
const leafKey = BigInt(3)
const leafValue = BigInt(4)
await tree.update(leafKey, leafValue)

// gen merkle proof
const proof = await tree.createProof(leafKey)

// verify merkle proof
const isValid = await tree.verifyProof(proof)
```

### Maci-crypto

```typescript
import {
    genRandomSalt,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
} from '../src'

// generate random BigInt
const salt = genRandomSalt()

// poseiden hash 5 BigInt elements
const values = [
    genRandomSalt(),
    genRandomSalt(),
    genRandomSalt(),
    genRandomSalt(),
    genRandomSalt(),
]
const hash5Value = hash5(values)

// poseiden hash 1 BigInt elements
const value = genRandomSalt()
const hashOneValue = hashOne(value)

// poseiden hash 2 BigInt elements
const leftValue = genRandomSalt()
const rightValue = genRandomSalt()
const hash = hashLeftRight(leftValue, rightValue)

const values = {
    input1: genRandomSalt(),
    input2: genRandomSalt(),
    input3: genRandomSalt(),
}
// stringify BigInt elements with stringifyBigInts function
const stringifiedValues = stringifyBigInts(values)
// it can be recoverd by unstringifyBigInts function
const unstringifiedValues = unstringifyBigInts(stringifiedValues)
```
