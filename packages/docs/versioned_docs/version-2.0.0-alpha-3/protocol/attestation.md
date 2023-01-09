---
description: How are attestations managed
---

# Attestation

Attestations happen on-chain. Each attestation is given to an epoch key and should update the leaf in the epoch tree. Only the root of the epoch tree is stored on-chain, so a ZK proof must be submitted in order to update this root. Attesters are responsible for either updating this root, or incentivizing others to do so.

UniRep uses a system to batch updates of the epoch tree. This system allows the tree to be updated on a per-epoch key basis; e.g. if epoch key X receives 100 attestations, only a single proof must be made.

UniRep offers an [`AggregateEpochKeys`](../circuits-api/circuits#aggregate-epoch-keys-proof) proof that allows a user to update multiple leaves in the epoch tree using a single proof, with a constant number of public signals.

## Hashchain

In the Unirep contract, a Hashchain is a data structure that is used to store a sequence of epoch keys and their corresponding reputation balances. It is used to transition user reputation between epochs in a verifiable manner. The Hashchain data structure is composed of three fields:

* `head`: This is a reference to the first element in the Hashchain. It is used to identify the Hashchain, and is included in the zk proof generated when the Hashchain is processed.

* `epochKeys`: This is an array of epoch keys that are included in the Hashchain.

* `epochKeyBalances`: This is an array of reputation balances corresponding to the epoch keys in the epochKeys array.

The process of transitioning user reputation between epochs involves generating a Hashchain, and submitting it to the Unirep contract for processing. The contract verifies the Hashchain by checking the provided zk proof, and then updates the user's reputation based on the data in the Hashchain. Once a Hashchain has been processed, it is marked as "processed" to prevent it from being processed again.
