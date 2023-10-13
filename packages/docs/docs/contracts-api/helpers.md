---
title: UniRep contract helpers
---

## getUnirepContract

Connect to a Unirep contract with a given Unirep address.

```ts
const getUnirepContract = (
    address: string,
    signerOrProvider: ethers.Signer | ethers.providers.Provider
): Unirep
```

For example,

```ts
import { getUnirepContract } from '@unirep/contracts'

const unirep = getUnirepContract(
    address,          // the address of UniRep contract
    signerOrProvider, // the signer of the provider
)
```

## genSignature

Generate signature for attester if the attester signs up through [`attesterSignUpViaRelayer`](./unirep-sol.md#attestersignupviarelayer).

```ts
const genSignature = async (
    unirepAddress: string,
    attester: ethers.Signer | ethers.Wallet,
    epochLength: number,
    chainId: bigint | number
)
```

For example,

```ts
import { genSignature } from '@unirep/contracts'

// generate the signature
const signature = genSignature(
    address,     // the address of UniRep contract
    signer,      // the signer of the attester
    epochLength, // the epoch length of the attester
    chainId,     // the current chain ID of UniRep contract
)

// sign up with UniRep contract
const tx = await unirep.attesterSignUpViaRelayer(
    signer.address,
    epochLength,
    signature
)
```