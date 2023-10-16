# Nullifiers

Nullifiers are used to prevent things from happening more than once. 

## User State Transition Nullifier

* Prevent users from performing duplicate [user state transition](user-state-transition.md)
* UST Nullifier is either the epoch key with nonce `0` or `MAX_EPK_NONCE`, depending on whether the user has a leaf in the [epoch tree](trees.md#epoch-tree).
