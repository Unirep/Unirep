---
description: Definition of data in UniRep
---

# Data

Attesters define the data system for their application on top of the UniRep protocol. There are `FIELD_COUNT` data fields. It composes of two kinds of operations: addition field and replacement field.

## Addition field

The elements in addition field are combined with addition and modulo by [`SNARK_SCALAR_FIELD`](../utils-api/constants.md#snark_scalar_field). E.g. `data[0] = (old_data[0] + new_data[0]) % SNARK_SCALAR_FIELD`. There are `SUM_FIELD` addition fields.

## Replacement field

The elements in replacement field are combined by replacement. If the field `i` is the replacement field, the field `i+1` is the timestamp of the replacement field that will be emitted by the smart contract. E.g.
```ts
data[i]   = old_data[i+1] < new_data[i+1] ? new_data[i]   : old_data[i]
data[i+1] = old_data[i+1] < new_data[i+1] ? new_data[i+1] : old_data[i+1]
```

There are `FIELD_COUNT - SUM_FIELD` replacement fields and it should be `(FIELD_COUNT - SUM_FIELD) % 2 == 0`.
