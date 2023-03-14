---
title: BuildOrderedTree
---

A class representing an [build ordered tree proof](circuits#build-ordered-tree). Each of the following properties are public signals for the proof.

```ts
import { BuildOrderedTree } from '@unirep/circuits'

const data = new BuildOrderedTree(publicSignals, proof)
```

## root

The output ordered tree root

```ts
this.root
```

## checksum

The output [polysum](../protocol/polysum.md) of all attestations.

```ts
this.checksum
```

## buildInputsForLeaves

A helper function to build all attestations from attestations.

```ts
buildInputsForLeaves(
    preimages: any[],
    arity = CircuitConfig.default.EPOCH_TREE_ARITY,
    depth = CircuitConfig.default.EPOCH_TREE_DEPTH,
    fieldCount = CircuitConfig.default.FIELD_COUNT
): {
    circuitInputs,
    leaves,
    sortedLeaves
}
```