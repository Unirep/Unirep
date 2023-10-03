# UniRep circuits package

Client library for circuit related functions which are used in UniRep protocol.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@unirep/circuits">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/circuits?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@unirep/circuits">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@unirep/circuits.svg?style=flat-square" />
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

Install the `@unirep/circuits` package with npm:

```bash
npm i @unirep/circuits
```

or yarn:

```bash
yarn add @unirep/circuits
```

## 📔 Usage

### Prover

**Build a prover for UniRep protocol**
```typescript
import * as snarkjs from 'snarkjs'
import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof, SnarkPublicSignals } from '@unirep/utils'

const buildPath = 'PATH/TO/CIRCUIT/FOLDER/'

const prover: Prover = {
    genProofAndPublicSignals: async (
        proofType: string | Circuit,
        inputs: any
    ): Promise<{
        proof: any,
        publicSignals: any
    }> => {
        const circuitWasmPath = buildPath + `${proofType}.wasm`
        const zkeyPath = buildPath + `${proofType}.zkey`
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            circuitWasmPath,
            zkeyPath
        )

        return { proof, publicSignals }
    },

    verifyProof: async (
        name: string | Circuit,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ): Promise<boolean> => {
        const vkey = require(buildPath +  `${name}.vkey.json`)
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    },
}
```

**Generate proof and verify it with the above prover**
```typescript
import { Circuit } from '@unirep/circuits'

// See ./test/verifyEpochKey.test.ts for generating circuit inputs
const circuitInputs = {
    state_tree_elements: ...,
    state_tree_indices: ...,
    ...
}
const { proof, publicSignals } = await prover.genProofAndPublicSignals(
    Circuit.epochKey,
    circuitInputs
)

const isValid = await prover.verifyProof(
    Circuit.epochKey,
    publicSignals,
    proof
)
```

### Circom

Use the unirep circom circuits like so:

```circom
pragma circom 2.1.0;

include "PATH/TO/node_modules/@unirep/circuits/circuits/epochKey.circom";

template DataProof(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT) {
    signal input state_tree_indices[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    signal input identity_secret;
    signal input data[FIELD_COUNT];
    signal input sig_data;
    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;
    signal input chain_id;

    signal output epoch_key;
    signal output state_tree_root;   

    (epoch_key, state_tree_root, control) <== EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
        state_tree_indices, 
        state_tree_elements, 
        identity_secret,
        reveal_nonce,
        attester_id,
        epoch,
        nonce,
        data,
        sig_data,
        chain_id
    );

    // add your customized circuits
    ...
}
```

### Proof helpers

Proof helpers can help users query the public signals in each proof.

**EpochKeyProof**

```ts
import { EpochKeyProof } from '@unirep/circuits'

const { proof, publicSignals } = await prover.genProofAndPublicSignals(
    Circuit.epochKey,
    circuitInputs
)
const data = new EpochKeyProof(publicSignals, proof)
const epk = data.epochKey
```

**SignupProof**

```ts
import { SignupProof } from '@unirep/circuits'

const { proof, publicSignals } = await prover.genProofAndPublicSignals(
    Circuit.signup,
    circuitInputs
)
const data = new SignupProof(publicSignals, proof)
const identityCommitment = data.identityCommitment
```

## 🙌🏻 Join our community
- Discord server: <a href="https://discord.gg/VzMMDJmYc5"><img src="https://img.shields.io/discord/931582072152281188?label=Discord&style=flat-square&logo=discord"></a>
- Twitter account: <a href="https://twitter.com/UniRep_Protocol"><img src="https://img.shields.io/twitter/follow/UniRep_Protocol?style=flat-square&logo=twitter"></a>
- Telegram group: <a href="https://t.me/unirep"><img src="https://img.shields.io/badge/telegram-@unirep-blue.svg?style=flat-square&logo=telegram"></a>

## <img height="24" src="https://pse.dev/_next/static/media/header-logo.16312102.svg"> Privacy & Scaling Explorations

This project is supported by [Privacy & Scaling Explorations](https://github.com/privacy-scaling-explorations) in Ethereum Foundation.
See more projects on: https://pse.dev/.
