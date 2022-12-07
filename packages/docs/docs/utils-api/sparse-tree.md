---
title: "Sparse Merkle Tree"
---

Import this class like so:

```js
import { SparseMerkleTree } from '@unirep/utils'

const tree = new SparseMerkleTree(32)
```

## constructor

Get a new tree instance.
```ts
constructor(
  height: number,
  zeroValue: bigint = 0,
  arity: number = 2
): SparseMerkleTree
```

## height

Get the number of levels in the tree. (getter)
```ts
tree.height
```

## root

Get the current root of the tree. (getter)
```ts
tree.root
```

## update

Update a leaf in the tree.
```ts
tree.update(index: bigint, value: bigint)
```

## getLeaf

Retrieve a leaf from the tree by index.

```ts
tree.getLeaf(index: bigint): bigint
```

## createProof

Create a merkle inclusion proof for a leaf.
```ts
tree.createProof(index: bigint): bigint[][]
```

## verifyProof

Verify a merkle inclusion proof.
```ts
tree.verifyProof(index: bigint, proof: bigint[][]): boolean
```
