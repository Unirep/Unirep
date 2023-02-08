---
description: How are attestations managed
---

# Attestation

Attestations happen on-chain. Each attestation is given to an epoch key and should update the leaf in the epoch tree. Only the root of the epoch tree is stored on-chain, so a ZK proof must be submitted in order to update this root. Attesters are responsible for either updating this root, or incentivizing others to do so.

## Ordered Merkle Tree

At the end of each epoch all the new epoch tree leaves must be sorted and put into an [ordered merkle tree](../circuits-api/circuits#build-ordered-tree). This happens in a ZK proof that may be computed and submitted by anyone. The ordered merkle tree allows users to prove inclusion _and_ noninclusion.
