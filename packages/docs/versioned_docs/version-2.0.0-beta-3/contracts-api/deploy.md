---
title: Unirep contract deployment
---

## deployUnirep

Deploy `Unirep.sol` and its verifiers and connect libraries.

```ts
export const deployUnirep = async (
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
The default circuit configuration is set in [`CircuitConfig.ts`](https://github.com/Unirep/Unirep/blob/a55f6e77a09627ccc89f75135abb5caf86268f6c/packages/circuits/src/CircuitConfig.ts).<br/>
Please make sure the `CircuitConfig` matches your [`prover`](../circuits-api/prover.md).

If you don't compile circuits on your own, please don't change the `_settings` and `prover`.<br/>
See the current prover and settings of deployed contracts: [🤝 Testnet Deployment](../testnet-deployment.md).
:::