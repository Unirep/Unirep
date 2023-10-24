---
id: "modules"
title: "@unirep/utils"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Classes

- [IncrementalMerkleTree](classes/IncrementalMerkleTree.md)

## Interfaces

- [SnarkProof](interfaces/SnarkProof.md)

## Type Aliases

### Node

Ƭ **Node**: `any`

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/types/index.d.ts:1

___

### SnarkPublicSignals

Ƭ **SnarkPublicSignals**: `bigint`[]

Type of snark public signals.

#### Defined in

[packages/utils/src/snark.ts:4](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/snark.ts#L4)

## Variables

### ATTESTER\_ID\_BITS

• `Const` **ATTESTER\_ID\_BITS**: `bigint`

The number of bits in an [attester ID](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-) variable. It is defined as `BigInt(160)`.

#### Defined in

[packages/utils/src/crypto.ts:21](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L21)

___

### CHAIN\_ID\_BITS

• `Const` **CHAIN\_ID\_BITS**: `bigint`

The number of bits in a chain id variable. It is defined as `BigInt(36)`.

#### Defined in

[packages/utils/src/crypto.ts:29](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L29)

___

### EPOCH\_BITS

• `Const` **EPOCH\_BITS**: `bigint`

The number of bits in an [epoch](https://developer.unirep.io/docs/protocol/epoch) variable. It is defined as `BigInt(48)`.

#### Defined in

[packages/utils/src/crypto.ts:25](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L25)

___

### F

• `Const` **F**: `bigint`

A `bigint` representation of the field prime.

#### Defined in

[packages/utils/src/crypto.ts:12](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L12)

___

### MAX\_EPOCH

• `Const` **MAX\_EPOCH**: `number`

A `number` representation of the maximum epoch value. Equivalent to `2**48-1`.

#### Defined in

[packages/utils/src/crypto.ts:45](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L45)

___

### NONCE\_BITS

• `Const` **NONCE\_BITS**: `bigint`

The number of bits in an [epoch key nonce](https://developer.unirep.io/docs/protocol/epoch-key) variable. It is defined as `BigInt(8)`.

#### Defined in

[packages/utils/src/crypto.ts:17](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L17)

___

### ONE\_BIT

• `Const` **ONE\_BIT**: `bigint`

It indicates a one bit variable. It is defined as `BigInt(1)`.

#### Defined in

[packages/utils/src/crypto.ts:41](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L41)

___

### REP\_BITS

• `Const` **REP\_BITS**: `bigint`

The number of bits in a Rep variable. It is defined as `BigInt(64)`.

#### Defined in

[packages/utils/src/crypto.ts:37](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L37)

___

### REVEAL\_NONCE\_BITS

• `Const` **REVEAL\_NONCE\_BITS**: `bigint`

The number of bits in a reveal nonce variable. It is defined as `BigInt(1)`.

#### Defined in

[packages/utils/src/crypto.ts:33](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L33)

___

### SNARK\_SCALAR\_FIELD

• `Const` **SNARK\_SCALAR\_FIELD**: ``"21888242871839275222246405745257275088548364400416034343698204186575808495617"``

A decimal string representing the field prime.

#### Defined in

[packages/utils/src/crypto.ts:7](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L7)

## Functions

### genEpochKey

▸ **genEpochKey**(`identitySecret`, `attesterId`, `epoch`, `nonce`, `chainId`): `bigint`

Calculate an [epoch key](https://developer.unirep.io/docs/protocol/epoch-key).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `identitySecret` | `bigint` | The secret of a user's [Semaphore identity](https://semaphore.pse.dev/). |
| `attesterId` | `string` \| `bigint` | Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-). |
| `epoch` | `number` \| `bigint` | The epoch information. |
| `nonce` | `number` \| `bigint` | A epoch key nonce chosed by user. |
| `chainId` | `number` \| `bigint` | The current chain id. |

#### Returns

`bigint`

The epoch key result.

**`Example`**

```ts
import { Identity } from '@semaphore-protocol/identity'
import { genEpochKey } from '@unirep/utils'

const id = new Identity()
const attesterId = '0x1234'
const epoch = 0
const nonce = 0
const chainId = 1
const epochKey = genEpochKey(
  id.secret,
  attesterId,
  epoch,
  nonce,
  chainId
)
```

#### Defined in

[packages/utils/src/crypto.ts:86](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L86)

___

### genEpochTreeLeaf

▸ **genEpochTreeLeaf**(`epochKey`, `data`): `bigint`

Calculate an epoch tree leaf in an [epoch tree](https://developer.unirep.io/docs/protocol/trees#epoch-tree)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epochKey` | `string` \| `bigint` | The [epoch key](https://developer.unirep.io/docs/protocol/epoch-key) information. |
| `data` | (`string` \| `number` \| `bigint`)[] | The array of [data](https://developer.unirep.io/docs/protocol/data) of the epoch key in the epoch tree. |

#### Returns

`bigint`

The epoch tree leaf.

**`Example`**

```ts
import { genEpochTreeLeaf } from '@unirep/utils'

const epochKey = '0x3456'
const FIELD_COUNT = 6
const data = Array(FIELD_COUNT).fill(0)
const leaf = genEpochTreeLeaf(
  epochKey,
  data
)
```

#### Defined in

[packages/utils/src/crypto.ts:218](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L218)

___

### genIdentityHash

▸ **genIdentityHash**(`identitySecret`, `attesterId`, `epoch`, `chainId`): `bigint`

Calculate an identity hash for a user. It is used for user signup.
The state tree leaf should follow the format: `stateTreeLeaf = H(identityHash, H(data))`
where `identityHash = H(identitySecret, attesterId + (epoch << 160) + (chainId << 208))`.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `identitySecret` | `bigint` | The secret of a user's [Semaphore identity](https://semaphore.pse.dev/). |
| `attesterId` | `string` \| `bigint` | Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-). |
| `epoch` | `number` \| `bigint` | The epoch information. |
| `chainId` | `number` \| `bigint` | The current chain id. |

#### Returns

`bigint`

The identity hash.

**`Example`**

```ts
import { Identity } from '@semaphore-protocol/identity'
import { genIdentityHash } from '@unirep/utils'

const id = new Identity()
const attesterId = '0x1234'
const epoch = 0
const chainId = 1
const idHash = genIdentityHash(
  id.secret,
  attesterId,
  epoch,
  chainId
)
```

#### Defined in

[packages/utils/src/crypto.ts:134](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L134)

___

### genRandomSalt

▸ **genRandomSalt**(): `bigint`

Generate a random `bigint` in the snark finite field.

#### Returns

`bigint`

**`Example`**

```ts
import { genRandomSalt } from '@unirep/utils'

// generate random bigint
const salt = genRandomSalt()
```

#### Defined in

[packages/utils/src/crypto.ts:57](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L57)

___

### genStateTreeLeaf

▸ **genStateTreeLeaf**(`identitySecret`, `attesterId`, `epoch`, `data`, `chainId`): `bigint`

Calculate a [state tree](https://developer.unirep.io/docs/protocol/trees#state-tree) leaf for a user.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `identitySecret` | `bigint` | The secret of a user's [Semaphore identity](https://semaphore.pse.dev/). |
| `attesterId` | `string` \| `bigint` | Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-). |
| `epoch` | `number` \| `bigint` | The epoch information. |
| `data` | (`string` \| `number` \| `bigint`)[] | The array of user [data](https://developer.unirep.io/docs/protocol/data) in the current epoch. |
| `chainId` | `number` \| `bigint` | The current chain id. |

#### Returns

`bigint`

The state tree leaf.

**`Example`**

```ts
import { Identity } from '@semaphore-protocol/identity'
import { genStateTreeLeaf } from '@unirep/utils'

const id = new Identity()
const attesterId = '0x1234'
const epoch = 0
const FIELD_COUNT = 6
const data = Array(FIELD_COUNT).fill(0)
const chainId = 1
const leaf = genStateTreeLeaf(
  id.secret,
  attesterId,
  epoch,
  data,
  chainId
)
```

#### Defined in

[packages/utils/src/crypto.ts:179](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/crypto.ts#L179)

___

### stringifyBigInts

▸ **stringifyBigInts**(`o`): `any`

Stringify all `bigint`s in an object, a string, or an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `o` | `any` | An object with `bigint`, an array of `bigint`s, or a `bigint`. |

#### Returns

`any`

Stringified object, an array of string, or a string.

**`Example`**

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

#### Defined in

[packages/utils/src/stringify.ts:32](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/stringify.ts#L32)

___

### unstringifyBigInts

▸ **unstringifyBigInts**(`o`): `any`

Unstringify all `string`s in an object, a string, or an array to `bigint`s

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `o` | `any` | Stringified object, an array of string, or a string. |

#### Returns

`any`

An object with `bigint`, an array of `bigint`s, or a `bigint`.

**`Example`**

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

#### Defined in

[packages/utils/src/stringify.ts:69](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/utils/src/stringify.ts#L69)
