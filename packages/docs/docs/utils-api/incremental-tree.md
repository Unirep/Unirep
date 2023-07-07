---
title: "Incremental Merkle Tree"
---

:::info
The tree extends from [@zk-kit/incremental-merkle-tree](https://github.com/privacy-scaling-explorations/zk-kit/tree/main/packages/incremental-merkle-tree)<br/>
:::

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
  zeroValue: Node = 0,
  arity: number = 2
): IncrementalMerkleTree
```

## Node

The type of each leaf.

```ts
type Node = any
```

## insert

Insert a new leaf in the next free index.
```ts
tree.insert(leaf: Node)
```

## update

Update a leaf in the tree by index.
```ts
tree.update(index: number, leaf: Node)
```

## delete

Delete (set to zero value) a leaf in the tree.
```ts
tree.delete(index: number)
```

## indexOf

Get the index of given node.
```ts
tree.indexOf(leaf: Node)
```

## MerkleProof

A struct for representing merkle proofs.

```ts
type MerkleProof = {
  root: any
  leaf: any
  siblings: any[]
  pathIndices: number[]
}
```

## createProof

Get a merkle inclusion proof for an index.
```ts
tree.createProof(index: number): MerkleProof
```

## verifyProof

Verify a merkle proof in the tree.
```ts
tree.verifyProof(proof: MerkleProof): boolean
```
