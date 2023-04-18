---
title: "Hash functions"
---

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
