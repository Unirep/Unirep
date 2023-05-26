---
title: "Hash functions"
---

## genEpochKey

Calculate an epoch key.

```ts
import { genEpochKey } from '@unirep/utils'

genEpochKey(
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number,
): bigint
```

## genIdentityHash

Calculate an identity hash for a user. It is used for user signup. The state tree leaf should follow the format: `stateTreeLeaf = H(identityHash, H(data))` where `identityHash = H(identitySecret, attesterId + (epoch << 160))`.

```ts
import { genIdentityHash } from '@unirep/utils'

genIdentityHash(
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number
): bigint
```


## genStateTreeLeaf

Calculate a state tree leaf for a user.

```ts
import { genStateTreeLeaf } from '@unirep/utils'

genStateTreeLeaf(
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    data: (bigint | string | number)[]
): bigint
```

## genEpochTreeLeaf

Calculate a state tree leaf for a user.

```ts
import { genEpochTreeLeaf } from '@unirep/utils'

genEpochTreeLeaf(
    epochKey: bigint | string,
    data: (bigint | string | number)[]
): bigint
```
