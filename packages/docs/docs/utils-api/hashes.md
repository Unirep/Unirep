---
title: "Hash functions"
---

## genEpochKey

Calculate an [epoch key](../protocol/epoch-key.md).

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

Calculate an identity hash for a user. It is used for user signup. The state tree leaf should follow the format: <br/>
`stateTreeLeaf = H(identityHash, H(data))` where <br/>
`identityHash = H(identitySecret, attesterId + (epoch << 160))`.

:::info
See [state tree](../protocol/trees.md#state-tree) for more details.
:::

```ts
import { genIdentityHash } from '@unirep/utils'

genIdentityHash(
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number
): bigint
```


## genStateTreeLeaf

Calculate a [state tree](../protocol/trees.md#state-tree) leaf for a user.

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

Calculate a epoch tree leaf in an [epoch tree](../protocol/trees.md#epoch-tree).

```ts
import { genEpochTreeLeaf } from '@unirep/utils'

genEpochTreeLeaf(
    epochKey: bigint | string,
    data: (bigint | string | number)[]
): bigint
```
