# Unirep protocol package

Client library for interacting with Unirep protocol and Unirep contracts.

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

## 🔑 Get built circuits files

### Download from server

_(TODO) Get circuits files from [PSE server](http://www.trusted-setup-pse.org/)_

### Build circuits locally

```bash
git clone https://github.com/Unirep/Unirep.git && \
cd Unirep/ && \
yarn install && \
yarn build
```

The `zksnarkBuild` directory will be found in `./packages/circuits`

## 📑 Get Unirep contracts

- **Solution 1.** See how to deploy a contract 👉🏻 [@unirep/contracts](../contracts/README.md#👩🏻‍⚕️-havent-deployed-a-contract-yet)
- **Solution 2.** *(TODO) deploy on testnet/mainnet*
    | | address | zkFiles download |
    |--|--|--|
    | mainnet |  | |
    | kovan |  | |
    | goerli |   | |

## 📔 Usage 

### Unirep protocol

⚠️ **Notice:** These functions will not change the contract status. You need to interact with Unirep contracts with [@unirep/contracts](../contracts/README.md)

```typescript
import { UnirepProtocol } from '@unirep/core'

const zkFilsPath = 'PATH/TO/THE/ZKFILES/DIRECTORY'
const protocol = new UnirepProtocol(zkFilsPath)

// example of generate an epoch key
const id = new ZkIdentity()
const epoch = 1
const nonce = 0
const epochKey = protocol.genEpochKey(
    id.identityNullifier, 
    epoch, 
    nonce
)
```

### Generate Unirep state

```typescript
import { genUnirepState } from '@unirep/core'

const zkFilsPath = 'PATH/TO/THE/ZKFILES/DIRECTORY'
const provider = 'YOUR/ETH/PROVIDER'
const address = 'UNIREP/CONTRACT/ADDRESS'
const protocol = new UnirepProtocol(zkFilsPath)

// generate unirep state
const unirepState = await genUnirepState(
    protocol, 
    provider, 
    address,
)

// generate the global state tree of current epoch
const epoch = unirepState.currentEpoch
const GST = unirepState.genGST(epoch)

// check if a global state tree root is in the unirep state of given epoch
const exist = unirepState.GSTRootExists(
    GST.root,
    epoch
)
```

### Generate Unirep user state

```typescript
import { genUserState } from '@unirep/core'

const zkFilsPath = 'PATH/TO/THE/ZKFILES/DIRECTORY'
const provider = 'YOUR/ETH/PROVIDER'
const address = 'UNIREP/CONTRACT/ADDRESS'
const id = new ZkIdentity()
const protocol = new UnirepProtocol(zkFilsPath)

// generate unirep state
const userState = await genUserState(
    protocol, 
    provider, 
    address,
    id
)

// generate epoch key proof (if user has signed up)
const epkNonce = 0
const { 
    proof, 
    publicSignals 
} = await userState.genVerifyEpochKeyProof(epkNonce)
// verify the proof with a protocol object
const isValid = await protocol.verifyProof(
    CircuitName.verifyEpochKey,
    proof,
    publicSignals
)

// generate user state transition proofs
const {
    startTransitionProof,
    processAttestationProofs,
    finalTransitionProof,
} = await userState.genUserStateTransitionProofs()
// verify them with a protocol object
const isValid = await protocol.verifyProof(
    CircuitName.startTransition,
    startTransitionProof.proof,
    startTransitionProof.publicSignals
)
```