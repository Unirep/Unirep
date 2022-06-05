# Unirep contracts package

Client library for cryptography related functions which are used in unirep protocol.

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

Install the `@unirep/crypto` package with npm:

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

_(TODO) Get circuits files from [PSE server](http://www.trusted-setup-pse.org/)_

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

### Deploy contracts

_(TODO) Add `yarn deploy` command_

## 🙆🏻‍♀️ Unirep contract has been compiled

### Deploy Unirep contract

```typescript
import { ethers } from 'ethers'
import UnirepCircuit from '@unirep/circuits'
import UnirepContract, { ContractConfig } from '@unirep/contracts'

const zkFilesPath = 'PATH/TO/THE/ZKFILES/DIRECTORY'
const artifactsPath = 'PATH/TO/ARTIFACTS/DIRECTORY'
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'

// connect a signer
const signer = new ethers.Wallet(privateKey, provider)
// set contract and circuit config
const circuitConfig = UnirepCircuit.getConfig(zkFilsPath)
const config = {
    attestingFee: ethers.utils.parseEther('0.1'),
    epochLength: 30,
    maxUsers: 10,
    maxAttesters: 10,
    ...circuitConfig,
} as ContractConfig

// deploy unirep contract
const unirepContract = await UnirepContract.deploy(
    artifactsPath,
    signer,
    config
)
```

### Get unirep contract with address

```typescript
import UnirepContract from '@unirep/contracts'

const address = '0x....'
const provider = 'YOUR/ETH/PROVIDER'
const unirepContract = UnirepContract.get(address, provider)
```

## 🙋🏻‍♂️ Call Unirep contract in DApps

-   🚸 Please copy `verifiers/*.sol` files to `node_modules/@unirep/contracts/verifiers/` directories.
    ```bash
    cp -rf ../Unirep/packages/contracts/contracts/verifiers/* ./node_modules/@unirep/contracts/verifiers
    ```
    _(TODO) Find a better way to do this._

```solidity
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
