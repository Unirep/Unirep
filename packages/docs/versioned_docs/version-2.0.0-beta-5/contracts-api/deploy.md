---
title: Deployment
---

Import the deployment functions with:

```ts
import { deployUnirep } from '@unirep/contracts/deploy'
```

## deployUnirep

Deploy `Unirep.sol` and its verifiers and connect libraries.

```ts
const deployUnirep = async (
    deployer: ethers.Signer,
    _settings: CircuitConfig = CircuitConfig.default,
    prover?: Prover
): Promise<Unirep>
```

For example:

```ts
import { ethers } from 'ethers'
import { Unirep } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'
const deployer = new ethers.Wallet(privateKey, provider);
const unirepContract: Unirep = await deployUnirep(deployer)
```

:::caution
The default circuit configuration is set in [`CircuitConfig.ts`](https://github.com/Unirep/Unirep/blob/1a3c9c944925ec125a7d7d8bfa9990466389477b/packages/circuits/src/CircuitConfig.ts).<br/>
Please make sure the `CircuitConfig` matches your [`prover`](../circuits-api/interfaces/src.Prover.md).

If you don't compile circuits on your own, please don't change the `_settings` and `prover`.<br/>
See the current prover and settings of deployed contracts: [🤝 Testnet Deployment](../testnet-deployment.mdx).
:::

## deployVerifier

Deploy a given circuit verifier. The verifier is with a certain interface: [IVerifier.sol](./verifiers/iverifier-sol.md).

```ts
const deployVerifier = async (
    deployer: ethers.Signer,
    circuit: Circuit | string,
    prover?: Prover
): Promise<ethers.Contract>
```

## deployVerifiers

Deploy all known circuit verifiers.

```ts
const deployVerifiers = async (
    deployer: ethers.Signer,
    prover?: Prover
): Promise<{ [circuit: string]: Promise<string> }>
```

## deployVerifierHelpers

Deploy all known circuit verifier helpers. A helper can help with decoding public signals. For example: [EpochKeyVerifierHelper.sol](./verifiers/epoch-key-verifier-helper.md)

```ts
const deployVerifierHelpers = async (
    unirepAddress: string,
    deployer: ethers.Signer,
    prover?: Prover
)
```

## deployVerifierHelper

Deploy a given circuit verifier helper. For example: [EpochKeyVerifierHelper.sol](./verifiers/epoch-key-verifier-helper.md)

```ts
const deployVerifierHelper = async (
    unirepAddress: string,
    deployer: ethers.Signer,
    circuit: Circuit,
    prover?: Prover
): Promise<ethers.Contract>
```