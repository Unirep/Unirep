---
title: UniRep contract helpers
---

## getUnirepContract

Connect to a Unirep contract with a given Unirep address.

```ts
import { getUnirepContract } from '@unirep/contracts'

const unirep = getUnirepContract(
    address,          // the address of unirep contract
    signerOrProvider, // the signer of the provider
)
```

## genSignature

Generate signature for attester if the attester signs up through [`attesterSignUpViaRelayer`](./unirep-sol.md#attestersignupviarelayer).

```ts
import { genSignature } from '@unirep/contracts'

// generate the signature
const signature = genSignature(
    address,     // the address of unirep contract
    signer,      // the signer of the attester
    epochLength, // the epoch length of the attester
)

// sign up with unirep contract
const tx = await unirep.attesterSignUpViaRelayer(
    signer.address,
    epochLength,
    signature
)
```