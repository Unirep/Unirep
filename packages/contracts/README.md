# Unirep contracts package

Client library for contracts related functions which are used in unirep protocol.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@unirep/contracts">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/contracts?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@unirep/contracts">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@unirep/contracts.svg?style=flat-square" />
    </a>
    <a href="https://eslint.org/">
        <img alt="Linter eslint" src="https://img.shields.io/badge/linter-eslint-8080f2?style=flat-square&logo=eslint" />
    </a>
    <a href="https://prettier.io/">
        <img alt="Code style prettier" src="https://img.shields.io/badge/code%20style-prettier-f8bc45?style=flat-square&logo=prettier" />
    </a>
    <a href="https://contracts-coverage.unirep.io/">
        <img alt="Coverage report" src="https://contracts-coverage.unirep.io/badge.svg" />
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

Install the `@unirep/contracts` package with npm:

```bash
npm i @unirep/contracts
```

or yarn:

```bash
yarn add @unirep/contracts
```

## 👩🏻‍⚕️ Haven't deployed a contract yet?

### Get circuit keys from one of the following methods

**🍀 Solution 1. Download circuit keys from server**

Get circuits files from [PSE server](http://www.trusted-setup-pse.org/).

**🍀 Solution 2. Build circuits locally**

```bash
git clone https://github.com/Unirep/Unirep.git && \
cd Unirep/ && \
yarn install && \
yarn build
```

By default, The `zksnarkBuild` directory will be found in `./packages/circuits`

### Compile contracts from the keys

**Step 1. Set the `zksnarkBuild` path in [buildVerifier.ts](./scripts/buildVerifiers.ts)**

**Step 2. Run compile command**

```bash
yarn contracts compile
```

By default, The `artifacts` directory will be found in `./packages/contracts/build`

## 🙆🏻‍♀️ Unirep contract has been compiled

### Deploy Unirep contract

Deploy Unirep smart contract with default [config](../circuits/config/index.ts):

```typescript
import ethers from 'ethers'
import { deployUnirep, Unirep } from '@unirep/contracts/deploy'

const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'
const deployer = new ethers.Wallet(privateKey, provider);

const unirepContract: Unirep = await deployUnirep(deployer)
```

_(TODO) A `deploy` script_
```bash
yarn contracts deploy
```

### Get unirep contract with address

```typescript
import ethers from 'ethers'
import { getUnirepContract, Unirep } from '@unirep/contracts'

const address = '0x....'
const provider = 'YOUR/ETH/PROVIDER'

const unirepContract: Unirep = getUnirepContract(address, provider)
```

## 🧑🏻‍💻 Call Unirep contract with `ethers`

```typescript
import { ethers } from 'ethers'
import { ZkIdentity } from '@unirep/utils'
import { getUnirepContract, Unirep } from '@unirep/contracts'

const address = '0x....'
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'

// connect a signer
const signer = new ethers.Wallet(privateKey, provider)
const unirepContract: Unirep = getUnirepContract(address, signer)

// user sign up
const id = new ZkIdentity()
const tx = await unirepContract.userSignUp(id.genIdentityCommitment())

// attester sign up
const tx = await unirepContract.attesterSignUp()
```

## 🙋🏻‍♂️ Call Unirep contract in DApps

-   🚸 Please copy `verifiers/*.sol` files to `node_modules/@unirep/contracts/verifiers/` directories.
    ```bash
    cp -rf ../Unirep/packages/contracts/contracts/verifiers/* ./node_modules/@unirep/contracts/verifiers
    ```
    _(TODO) Find a better way to do this._

```javascript
import { Unirep } from '@unirep/contracts/Unirep.sol';

contract YourContract {
    Unirep public unirep;

    uint256 internal _attesterId;

    // Initialize contract with a deployed
    constructor(Unirep _unirepContract) {
        // Set the unirep contract address
        unirep = _unirepContract;
    }

    // Relay Users sign up in Unirep
    function signUp(uint256 idCommitment) external {
        unirep.userSignUp(idCommitment);
    }

    // Sign up this contract as an attester
    function signUpContract() external {
        unirep.attesterSignUp();
        _attesterId = unirep.attesters(address(this));
    }

    // Users submit their epoch key proof to Unirep contract
    // And get attestation from the contract
    function submitEpochKeyProof(Unirep.EpochKeyProof memory input)
        external
        payable
    {
        // Step 1. submit epoch key proof
        unirep.submitEpochKeyProof(input);

        // Step 2. get proof index
        bytes32 proofNullifier = unirep.hashEpochKeyProof(input);
        uint256 proofIndex = unirep.getProofIndex(proofNullifier);

        // Step 3. init attestation
        // create an attestation which sends 5 positive Rep to the epochKey
        Unirep.Attestation memory attestation;
        attestation.attesterId = _attesterId;
        attestation.posRep = 5;

        // Step 4. send attestation
        unirep.submitAttestation{ value: unirep.attestingFee() }(
            attestation,
            input.epochKey,
            proofIndex,
            0 // if no reputation spent required
        );
    }
}
```

## 📚 Other usages

### Proofs

**An example of epoch key proof**
**1. Generate an epoch key proof structure**
```typescript
import { Circuit } from '@unirep/circuits'
import { EpochKeyProof } from '@unirep/contracts'

// see @unirep/circuits to know how to generate a prover and circuitInputs
const prover = {
    ...
}
const circuitInputs = {
    ...
}

const { publicSignals, proof } = await prover.genProofAndPublicSignals(
    Circuit.epochKey,
    circuitInputs
)

const epkProof = new EpochKeyProof(
    publicSignals,
    proof,
    prover
)
```
**2. Get data from epoch key proof structure**
```typescript
const epoch = epkProof.epoch
const epochKey = epkProof.epochKey
const stateTree = epkProof.stateTree
```

**3. Verify the epoch key proof**
```typescript
const isValid = await epkProof.verify()
```

**4. Compute keccak256 hash of the proof**
```typescript
const hash = epkProof.hash()
```

**5. The proof structure can help with formatting the proof on chain**
```typescript
const tx = await unirepContract.submitEpochKeyProof(
    epkProof.publicSignals,
    epkProof.proof
)
```
