---
title: "Helpers"
---

The package provides helpers for stringify and unstringify `bigint` objects.

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
