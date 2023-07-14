# UniRep utils package

Client library for utils functions which are used in UniRep protocol.

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

## 💡 About UniRep
**UniRep** is a *private* and *non-repudiable* **data system**. Users can receive attestations from attesters, and voluntarily prove facts about their data without revealing the data itself. Moreover, users cannot refuse to receive attestations from an attester.

## 📘 Documentation

Read the [medium article](https://medium.com/privacy-scaling-explorations/unirep-a-private-and-non-repudiable-reputation-system-7fb5c6478549) to know more about the concept of UniRep protocol.
For more information, refer to the [documentation](https://developer.unirep.io/)

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

## 🙌🏻 Join our community
- Discord server: <a href="https://discord.gg/VzMMDJmYc5"><img src="https://img.shields.io/discord/931582072152281188?label=Discord&style=flat-square&logo=discord"></a>
- Twitter account: <a href="https://twitter.com/UniRep_Protocol"><img src="https://img.shields.io/twitter/follow/UniRep_Protocol?style=flat-square&logo=twitter"></a>
- Telegram group: <a href="https://t.me/unirep"><img src="https://img.shields.io/badge/telegram-@unirep-blue.svg?style=flat-square&logo=telegram"></a>

## <img height="24" src="https://ethereum.org/static/a183661dd70e0e5c70689a0ec95ef0ba/13c43/eth-diamond-purple.png"> Privacy & Scaling Explorations

This project is supported by [Privacy & Scaling Explorations](https://github.com/privacy-scaling-explorations) in Ethereum Foundation.
See more projects on: https://appliedzkp.org/.
