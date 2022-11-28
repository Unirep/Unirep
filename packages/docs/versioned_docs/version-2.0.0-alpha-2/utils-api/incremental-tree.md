---
title: "Incremental Merkle Tree"
---

Import this class like so:

```js
import { IncrementalMerkleTree } from '@unirep/utils'

const tree = new IncrementalMerkleTree(32)
```

## constructor

Get a new tree instance.
```ts
constructor(
  depth: number,
  zeroValue: number = 0,
  arity: number = 2
): IncrementalMerkleTree
```

## insert

Insert a new leaf in the next free index.
```ts
tree.insert(leaf: bigint)
```

## update

Update a leaf in the tree by index.
```ts
tree.update(index: number, leaf: bigint)
```

## delete

Delete (set to zero value) a leaf in the tree.
```ts
tree.delete(index: number)
```

## Proof

A struct for representing merkle proofs.

```ts
type Proof = {
  root: bigint,
  leaf: bigint,
  pathIndices: number[],
  siblings: bigint[][]
}
```

## createProof

Get a merkle inclusion proof for an index.
```ts
tree.createProof(index: number): Proof
```

## verifyProof

Verify a merkle proof in the tree.
```ts
tree.verifyProof(proof: Proof): boolean
```
