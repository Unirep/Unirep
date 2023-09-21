---
title: "Helpers"
---

## SNARK_SCALAR_FIELD

A decimal string representing the field prime.

```ts
import { SNARK_SCALAR_FIELD } from '@unirep/utils'
```
## F

A `bigint` representation of the field prime.

```ts
import { F } from '@unirep/utils'
```

## MAX_EPOCH

A `number` representation of the maximum epoch value. Equivalent to `2**48-1`.

```ts
import { MAX_EPOCH } from '@unirep/utils'
```

## genEpochKey

Calculate an [epoch key](../protocol/epoch-key.md).

```ts
import { genEpochKey } from '@unirep/utils'

genEpochKey(
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number,
    chainId: bigint | number
): bigint
```

## genIdentityHash

Calculate an identity hash for a user. It is used for user signup. The state tree leaf should follow the format: <br/>
`stateTreeLeaf = H(identityHash, H(data))` where <br/>
`identityHash = H(identitySecret, attesterId + (epoch << 160) + (chainId << 208))`.

:::info
See [state tree](../protocol/trees.md#state-tree) for more details.
:::

```ts
import { genIdentityHash } from '@unirep/utils'

genIdentityHash(
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    chainId: bigint | number
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
    data: (bigint | string | number)[],
    chainId: bigint | number
): bigint
```

## genEpochTreeLeaf

Calculate an epoch tree leaf in an [epoch tree](../protocol/trees.md#epoch-tree).

```ts
import { genEpochTreeLeaf } from '@unirep/utils'

genEpochTreeLeaf(
    epochKey: bigint | string,
    data: (bigint | string | number)[]
): bigint
```

## stringifyBigInts

Stringify all `bigint`s in an object, a string, or an array

```ts
import { stringifyBigInts } from '@unirep/utils'

stringifyBigInts(BigInt(3)) 
// '3'

stringifyBigInts([BigInt(3)]) 
// ['3']

stringifyBigInts({
  item: BigInt(3)
}) 
// { item: '3' }
```

## unstringifyBigInts

Unstringify all `string`s in an object, a string, or an array to `bigint`s

```ts
import { unstringifyBigInts } from '@unirep/utils'

const values = {
    input1: '1',
    input2: '2',
    input3: '3',
}

unstringifyBigInts(values)
// { input1: 1n, input2: 2n, input3: 3n }
```
