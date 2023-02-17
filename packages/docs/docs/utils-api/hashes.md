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

Calculate an epoch key.

```ts
import { genEpochKey } from '@unirep/utils'

genEpochKey(
    identitySecret: bigint,
    attesterId: bigint,
    epoch: bigint | number,
    nonce: bigint | number,
): bigint
```

## genUserStateTransitionNullifier

Calculate a user state transition nullifier.
```ts
import { genUserStateTransitionNullifier } from '@unirep/utils'

genUserStateTransitionNullifier(
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: number | bigint
): bigint
```

## genStateTreeLeaf

Calculate a state tree leaf for a user.

```ts
import { genStateTreeLeaf } from '@unirep/utils'

genStateTreeLeaf(
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    data: (bigint | string)[]
): bigint
```

## genEpochTreeLeaf

Calculate a state tree leaf for a user.

```ts
import { genEpochTreeLeaf } from '@unirep/utils'

genEpochTreeLeaf(
    epochKey: bigint | string,
    data: (bigint | string)[]
): bigint
```
