---
description: Definition of user state transition in UniRep protocol.
---

# User State Transition

The user state transition is used to combine the data a user has received in an epoch. This happens in zk to ensure the user processes the data honestly and correctly. The proof then outputs a new state tree leaf for the epoch the user is transitioning to. This leaf contains the latest user data.

## Logical Flow

### 1. Prove the from epoch state leaf

The user will prove that they have a state tree leaf in the epoch they are transitioning _from_. The user will prove the data in this leaf and use it as the base to apply changes to.

### 2. Prove the history tree root

The user will prove that the epoch tree root and state tree root exist as a leaf in the history tree. This prevents the proof from revealing what epoch the user is transitioning from.

### 3. Prove epoch keys

The user will then compute their epoch keys for the epoch they are transitioning _from_. For each epoch key they will prove membership in the epoch tree.

Some epoch keys may not exist in the epoch tree. This is the case for keys that have not received attestations. The data for keys not proven to be in the epoch tree must be 0 (no change).

### 4. Apply changes

The proof will iterate over each data field for each epoch key. Each field will be combined using either summation or replacement (depending on field index and configuration).

### 5. Generate outputs

The proof will take the final data from step 3 and create a new state tree leaf containing this data. The proof will also iterate over all epoch keys and either:

<ol type="a">
  <li>Output the epoch key</li>
  <li>Output a random hash</li>
</ol>


If the epoch key _does not_ exist in the epoch tree it will do **a**. Otherwise it will do **b**.

### 5. Submit the proof (or evaluate offchain)

To safely evaluate a state transition proof you must check a few things (in addition to verifying the proof):

<ol type="a">
  <li>Check that the history tree root exists</li>
  <li>Check that the output epoch keys did <i>not</i> receive attestations</li>
  <li>Check that the first output epoch key has not been seen before</li>
</ol>

Item **c** only applies to onchain verification to prevent double UST.

If all of this is valid the new state tree leaf may be inserted into the state tree (or otherwise used for proofs).

:::info
See also:

* [Trees](trees.md)
* [User State Transition Proof](../circuits-api/circuits#user-state-transition-proof)
:::
