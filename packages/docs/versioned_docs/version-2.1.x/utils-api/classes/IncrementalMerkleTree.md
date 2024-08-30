---
id: "IncrementalMerkleTree"
title: "Class: IncrementalMerkleTree"
sidebar_label: "IncrementalMerkleTree"
sidebar_position: 0
custom_edit_url: null
---

The modified IncrementalMerkleTree which is used in Unirep protocol to generate global state tree. It inherited from `IncrementalMerkleTree` from [`@zk-kit/incremental-merkle-tree`](https://zkkit.pse.dev/modules/_zk_kit_incremental_merkle_tree.html)

**`Example`**

```ts
import { IncrementalMerkleTree } from '@unirep/utils'

const tree = new IncrementalMerkleTree(32)
```

## Hierarchy

- `default`

  ↳ **`IncrementalMerkleTree`**

## Constructors

### constructor

• **new IncrementalMerkleTree**(`depth`, `zeroValue?`, `arity?`)

Initializes the tree with the hash function, the depth, the zero value to use for zeroes
and the arity (i.e. the number of children for each node).
Fixed hash function: poseidon

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `depth` | `number` | `undefined` | Tree depth. |
| `zeroValue` | `any` | `0` | Zero values for zeroes (default: `0`). |
| `arity` | `number` | `2` | The number of children for each node (default: `2`). |

#### Overrides

zkIncrementalMerkleTree.constructor

#### Defined in

[packages/utils/src/IncrementalMerkleTree.ts:25](https://github.com/Unirep/Unirep/blob/60105749/packages/utils/src/IncrementalMerkleTree.ts#L25)

## Properties

### maxDepth

▪ `Static` `Readonly` **maxDepth**: ``32``

#### Inherited from

zkIncrementalMerkleTree.maxDepth

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:10

## Accessors

### arity

• `get` **arity**(): `number`

Returns the number of children for each node.

#### Returns

`number`

Number of children per node.

#### Inherited from

zkIncrementalMerkleTree.arity

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:50

___

### depth

• `get` **depth**(): `number`

Returns the depth of the tree.

#### Returns

`number`

Tree depth.

#### Inherited from

zkIncrementalMerkleTree.depth

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:35

___

### leaves

• `get` **leaves**(): `any`[]

Returns the leaves of the tree.

#### Returns

`any`[]

List of leaves.

#### Inherited from

zkIncrementalMerkleTree.leaves

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:40

___

### root

• `get` **root**(): `any`

Returns the root hash of the tree.

#### Returns

`any`

Root hash.

#### Inherited from

zkIncrementalMerkleTree.root

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:30

___

### zeroes

• `get` **zeroes**(): `any`[]

Returns the zeroes nodes of the tree.

#### Returns

`any`[]

List of zeroes.

#### Inherited from

zkIncrementalMerkleTree.zeroes

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:45

## Methods

### createProof

▸ **createProof**(`index`): `MerkleProof`

Creates a proof of membership.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `index` | `number` | Index of the proof's leaf. |

#### Returns

`MerkleProof`

Proof object.

#### Inherited from

zkIncrementalMerkleTree.createProof

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:79

___

### delete

▸ **delete**(`index`): `void`

Deletes a leaf from the tree. It does not remove the leaf from
the data structure. It set the leaf to be deleted to a zero value.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `index` | `number` | Index of the leaf to be deleted. |

#### Returns

`void`

#### Inherited from

zkIncrementalMerkleTree.delete

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:67

___

### indexOf

▸ **indexOf**(`leaf`): `number`

Returns the index of a leaf. If the leaf does not exist it returns -1.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `leaf` | `any` | Tree leaf. |

#### Returns

`number`

Index of the leaf.

#### Inherited from

zkIncrementalMerkleTree.indexOf

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:56

___

### insert

▸ **insert**(`leaf`): `void`

Inserts a new leaf in the tree.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `leaf` | `any` | New leaf. |

#### Returns

`void`

#### Inherited from

zkIncrementalMerkleTree.insert

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:61

___

### update

▸ **update**(`index`, `newLeaf`): `void`

Updates a leaf in the tree.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `index` | `number` | Index of the leaf to be updated. |
| `newLeaf` | `any` | New leaf value. |

#### Returns

`void`

#### Inherited from

zkIncrementalMerkleTree.update

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:73

___

### verifyProof

▸ **verifyProof**(`proof`): `boolean`

Verifies a proof and return true or false.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `proof` | `MerkleProof` | Proof to be verified. |

#### Returns

`boolean`

True or false.

#### Inherited from

zkIncrementalMerkleTree.verifyProof

#### Defined in

node_modules/@zk-kit/incremental-merkle-tree/dist/types/incremental-merkle-tree.d.ts:85
