---
description: Definition of data in UniRep
---

# Data

Attesters define the data system for their application on top of the UniRep protocol. There are `FIELD_COUNT` data fields. It composes of two kinds of operations: addition field and replacement field.

## Addition field

The elements in addition field are combined with addition and modulo by [`SNARK_SCALAR_FIELD`](../utils-api/constants.md#snark_scalar_field). E.g. `data[0] = (old_data[0] + new_data[0]) % SNARK_SCALAR_FIELD`. There are `SUM_FIELD_COUNT` addition fields.

## Replacement field

The elements in replacement field are combined by replacement. Each replacement field contains 2 parts:

- 205 bits data (lower bits)
- 48 bits index (upper bits)

The maximum value that can be stored in a replacement field is `2**205-1`. The `index` value is used by the protocol to order the attestations. Because the index is stored as the higher order bits data field attestation can be sorted without bit operations.

There are `FIELD_COUNT - SUM_FIELD_COUNT` replacement fields.
