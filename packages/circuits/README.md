# Unirep circuits package

Client library for generating and verifying Unirep ZK proofs.

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
        <a href="https://discord.gg/uRPhQVB2">
            🤖 Chat &amp; Support
        </a>
    </h4>
</div>

---

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

## 🔑 Get built circuits files
### Download from server

*(TODO) Get circuits files from [PSE server](http://www.trusted-setup-pse.org/)*

### Build circuits locally

```bash
git clone https://github.com/Unirep/Unirep.git && \
cd Unirep/ && \
yarn install && \
yarn build
```

The `zksnarkBuild` directory will be found in `./packages/circuits`

## 📔 Usage

### Get circuit configuration

```typescript
import UnirepCircuit from '@unirep/circuits'

const zkFilsPath = 'PATH/TO/THE/ZKFILES/DIRECTORY'
const config = UnirepCircuit.getConfig(zkFilsPath)
```

### Generate proof

```typescript
import UnirepCircuit, { CircuitName } from '@unirep/circuits'

const zkFilsPath = 'PATH/TO/THE/ZKFILES/DIRECTORY'
// the name of the circuit that user wants to proof
const circuitName = CircuitName.verifyEpochKey
// circuit input details can be found in test scripts
const circuitInputs = {
    GST_path_elements: ...,
    GST_path_index: ...,
    GST_root: ...,
    identity_nullifier: ...,
    identity_trapdoor: ...,
    user_tree_root: ...,
    nonce: ...,
    epoch: ...,
    epoch_key: ...,
}
const { proof, publicSignals } = await UnirepCircuit.genProof(
    zkFilsPath,
    circuitName,
    circuitInputs
)
```

### Verify proof
```typescript
const isValid = await UnirepCircuit.verifyProof(
    zkFilsPath,
    CircuitName.verifyEpochKey,
    proof,
    publicSignals
)
```

## 🔎 Circuit details

<h3><code>verifyEpochKey</code></h3>

1. Check if user exists in the Global State Tree
2. Check nonce validity
3. Check if epoch key is computed correctly

<h3><code>startTransition</code></h3>

1. Check if user exists in the Global State Tree
2. Compute blinded user state and blinded hash chain to start user state transition

<h3><code>processAttestations</code></h3>

1. Verify blinded input user state
2. Verify attestation hash chain
3. Process attestations and update user state tree
4. Compute blinded user state and blinded hash chain to continue user state transition

<h3><code>userStateTransition</code></h3>

1. Check if user exists in the Global State Tree
2. Process the hashchain of the epoch key specified by nonce `n`
3. Check if blinded user state matches
4. Compute and output nullifiers and new GST leaf

<h3><code>proveReputation</code></h3>

1. Check if user exists in the Global State Tree and verify epoch key
2. Check if the reputation given by the attester is in the user state tree
3. Check reputation nullifiers are valid
4. Check if user has reputation greater than min_rep
5. Check pre-image of graffiti

<h3><code>proveUserSignUp</code></h3>

1. Check if user exists in the Global State Tree and verify epoch key
2. Check if the reputation given by the attester is in the user state tree
3. Indicate if user has signed up in the attester's application
    > Fixed epoch key nonce: one user is only allowed to get attester's airdrop once per epoch
    > Sign up flag cannot be overwritten. Once a user has signed up before, he can always prove that he has signed up.