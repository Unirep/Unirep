---
title: ABIs
---

## ABI of Unirep.sol

Import the abi of `Unirep.sol` like so,

```ts
import abi from '@unirep/contracts/abi/Unirep.json'
```

Connect Unirep contract with `ethers`, for example,

```ts
import { ethers } from 'ethers'
import abi from '@unirep/contracts/abi/Unirep.json'

const unirepAddress = '0x...'
const provider = new ethers.providers.JsonRpcProvider(PROVIDER)
const unirep = new ethers.Contract(
    unirepAddress,
    abi,
    provider
)
```

:::info
See current [testnet deployment](../testnet-deployment.mdx).
:::

## ABI of other contracts

For example, importing abi of [`EpochKeyVerifierHelper.sol`](./verifiers/epoch-key-verifier-helper.md)

```ts
import abi from '@unirep/contracts/artifacts/contracts/verifierHelpers/EpochKeyVerifierHelper.sol/EpochKeyVerifierHelper.json'
```