---
description: How are attestations managed
---

# Attestation

Attestations happen on-chain. Each attestation is given to an epoch key and should update the leaf in the epoch tree. Only the root of the epoch tree is stored on-chain, so a ZK proof must be submitted in order to update this root. Attesters are responsible for either updating this root, or incentivizing others to do so.

UniRep uses a system to batch updates of the epoch tree. This system allows the tree to be updated on a per-epoch key basis; e.g. if epoch key X receives 100 attestations, only a single proof must be made.

UniRep offers an [`AggregateEpochKeys`](../circuits-api/circuits#aggregate-epoch-keys-proof) proof that allows a user to update multiple leaves in the epoch tree using a single proof, with a constant number of public signals.

## Hashchain

When an attestation is made it is stored in an on-chain mapping. When it is time to update the epoch tree root the `buildHashchain` function can be used to make a hashchain of epoch keys that need to be updated. This hashchain is output by the ZK proof and compared when it is processed.

TODO: more detailed descriptions
