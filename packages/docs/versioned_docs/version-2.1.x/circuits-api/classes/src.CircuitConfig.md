---
id: "src.CircuitConfig"
title: "Class: CircuitConfig"
sidebar_label: "CircuitConfig"
custom_edit_url: null
---

[src](../modules/src.md).CircuitConfig

Use the default circuit config like so:

**`Example`**

```ts
import { CircuitConfig } from '@unirep/circuits'

const { 
 STATE_TREE_DEPTH,
 EPOCH_TREE_DEPTH,
 HISTORY_TREE_DEPTH,
 NUM_EPOCH_KEY_NONCE_PER_EPOCH,
 FIELD_COUNT,
 SUM_FIELD_COUNT,
 REPL_NONCE_BITS,
 SNARK_SCALAR_FIELD,
 EPOCH_BITS,
 NONCE_BITS,
 ATTESTER_ID_BITS,
 CHAIN_ID_BITS,
 REVEAL_NONCE_BITS,
 REP_BITS,
 ONE_BIT
} = CircuitConfig.default
```
:::info
See current deployment config: [testnet-deployment](https://developer.unirep.io/docs/testnet-deployment)
:::

## Constructors

### constructor

• **new CircuitConfig**(`_config?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_config` | `Object` |
| `_config.EPOCH_TREE_DEPTH?` | `number` |
| `_config.FIELD_COUNT?` | `number` |
| `_config.HISTORY_TREE_DEPTH?` | `number` |
| `_config.NUM_EPOCH_KEY_NONCE_PER_EPOCH?` | `number` |
| `_config.REPL_NONCE_BITS?` | `number` |
| `_config.STATE_TREE_DEPTH?` | `number` |
| `_config.SUM_FIELD_COUNT?` | `number` |

#### Defined in

[circuits/src/CircuitConfig.ts:91](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L91)

## Properties

### ATTESTER\_ID\_BITS

• **ATTESTER\_ID\_BITS**: `bigint` = `ATTESTER_ID_BITS`

#### Defined in

[circuits/src/CircuitConfig.ts:64](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L64)

___

### CHAIN\_ID\_BITS

• **CHAIN\_ID\_BITS**: `bigint` = `CHAIN_ID_BITS`

#### Defined in

[circuits/src/CircuitConfig.ts:65](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L65)

___

### EPOCH\_BITS

• **EPOCH\_BITS**: `bigint` = `EPOCH_BITS`

#### Defined in

[circuits/src/CircuitConfig.ts:62](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L62)

___

### EPOCH\_TREE\_DEPTH

• **EPOCH\_TREE\_DEPTH**: `number`

#### Defined in

[circuits/src/CircuitConfig.ts:52](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L52)

___

### FIELD\_COUNT

• **FIELD\_COUNT**: `number`

#### Defined in

[circuits/src/CircuitConfig.ts:55](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L55)

___

### HISTORY\_TREE\_DEPTH

• **HISTORY\_TREE\_DEPTH**: `number`

#### Defined in

[circuits/src/CircuitConfig.ts:53](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L53)

___

### MAX\_SAFE\_BITS

• **MAX\_SAFE\_BITS**: `bigint`

#### Defined in

[circuits/src/CircuitConfig.ts:61](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L61)

___

### NONCE\_BITS

• **NONCE\_BITS**: `bigint` = `NONCE_BITS`

#### Defined in

[circuits/src/CircuitConfig.ts:63](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L63)

___

### NUM\_EPOCH\_KEY\_NONCE\_PER\_EPOCH

• **NUM\_EPOCH\_KEY\_NONCE\_PER\_EPOCH**: `number`

#### Defined in

[circuits/src/CircuitConfig.ts:54](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L54)

___

### ONE\_BIT

• **ONE\_BIT**: `bigint` = `ONE_BIT`

#### Defined in

[circuits/src/CircuitConfig.ts:68](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L68)

___

### REPL\_NONCE\_BITS

• **REPL\_NONCE\_BITS**: `number`

#### Defined in

[circuits/src/CircuitConfig.ts:57](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L57)

___

### REP\_BITS

• **REP\_BITS**: `bigint` = `REP_BITS`

#### Defined in

[circuits/src/CircuitConfig.ts:67](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L67)

___

### REVEAL\_NONCE\_BITS

• **REVEAL\_NONCE\_BITS**: `bigint` = `REVEAL_NONCE_BITS`

#### Defined in

[circuits/src/CircuitConfig.ts:66](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L66)

___

### SNARK\_SCALAR\_FIELD

• **SNARK\_SCALAR\_FIELD**: `string`

#### Defined in

[circuits/src/CircuitConfig.ts:59](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L59)

___

### STATE\_TREE\_DEPTH

• **STATE\_TREE\_DEPTH**: `number`

#### Defined in

[circuits/src/CircuitConfig.ts:51](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L51)

___

### SUM\_FIELD\_COUNT

• **SUM\_FIELD\_COUNT**: `number`

#### Defined in

[circuits/src/CircuitConfig.ts:56](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L56)

## Accessors

### REPL\_FIELD\_BITS

• `get` **REPL_FIELD_BITS**(): `number`

#### Returns

`number`

#### Defined in

[circuits/src/CircuitConfig.ts:87](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L87)

___

### contractConfig

• `get` **contractConfig**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `epochTreeDepth` | `number` |
| `fieldCount` | `number` |
| `historyTreeDepth` | `number` |
| `numEpochKeyNoncePerEpoch` | `number` |
| `replFieldBits` | `number` |
| `replNonceBits` | `number` |
| `stateTreeDepth` | `number` |
| `sumFieldCount` | `number` |

#### Defined in

[circuits/src/CircuitConfig.ts:74](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L74)

___

### default

• `Static` `get` **default**(): [`CircuitConfig`](src.CircuitConfig.md)

#### Returns

[`CircuitConfig`](src.CircuitConfig.md)

#### Defined in

[circuits/src/CircuitConfig.ts:70](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/CircuitConfig.ts#L70)
