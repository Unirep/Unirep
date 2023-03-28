---
title: "Constants"
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

## OMT_R

The `R` value for the ordered merkle tree polysum. Equal to the poseidon hash of the utf8 text `unirep_omt_polysum_constant`.

```ts
import { OMT_R } from '@unirep/utils'
```

## EPK_R

The `R` value used for the epoch tree leaves. Equal to the poseidon hash of the utf8 text `unirep_epk_polysum_constant`.

```ts
import { EPK_R } from '@unirep/utils'
```
