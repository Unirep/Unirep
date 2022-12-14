---
title: "Hash functions"
---

## Hashes

Poseidon hash of variable number of items.
```ts
import { hash1, hash2, hash3, /* etc */ } from '@unirep/utils'

hash1(items: any[]): bigint
hash2(items: any[]): bigint
hash3(items: any[]): bigint
...
hash8(items: any[]): bigint
```

## genEpochKey

Calculate an epoch key. `maxEpochKey` is the maximum value for a key. The hash will be modded by this value, e.g. `H(...) % maxEpochKey`. For a binary tree this should be `2**depth`.
```ts
import { genEpochKey } from '@unirep/utils'

genEpochKey(
    identityNullifier: bigint,
    attesterId: bigint,
    epoch: bigint | number,
    nonce: bigint | number,
    maxEpochKey: bigint | number
): bigint
```

## genEpochNullifier

Calculate a user state transition nullifier. TODO: update name
```ts
import { genEpochNullifier } from '@unirep/utils'

genEpochNullifier(
    identityNullifier: bigint,
    attesterId: bigint | string,
    epoch: number | bigint
): bigint
```

## genStateTreeLeaf

Calculate a state tree leaf for a user.
```ts
import { genStateTreeLeaf } from '@unirep/utils'

genStateTreeLeaf(
    idNullifier: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    posRep: bigint | number,
    negRep: bigint | number,
    graffiti: bigint | number,
    timestamp: bigint | number
): bigint
```
