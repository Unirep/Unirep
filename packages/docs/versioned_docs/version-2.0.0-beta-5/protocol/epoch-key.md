---
description: Definition of epoch key in UniRep
---

# Epoch Key

Epoch keys are public, temporary, identifiers for users.

* Unique epoch keys are generated for each user in each epoch.
* They are the users' temporary personas, allowing anonymous interaction with others.
* Epoch keys receive attestations to change user data.
* An epoch key is computed by:
```typescript
const field = 
    attesterId + 
    (epoch << 160) + 
    (nonce << 208) + 
    (chainId << 216)
poseidon2([identitySecret, field])
```
The field looks like:

| chain id|  nonce | epoch | attester id |
| :--: | :--: | :--: | :--: | 
| 36 bits|  8 bits | 48 bits | 160 bits |

where `nonce` can be any value between `0` and `numEpochKeyNoncePerEpoch - 1`, so that a user can have `numEpochKeyNoncePerEpoch` epoch keys per epoch.

* Only a user knows their `identitySecret`, so only they know if they have received an attestation; others see an attestation given to a random value.
* In the [epoch key proof](../circuits-api/circuits#epoch-key-proof) circuit, a user can prove that they own an `epochKey`, and so are able to receive and process attestations given to that `epochKey`.

:::info
See also

* [Epoch](epoch.md)
* [User State Transition](user-state-transition.md)
* [Epoch Key Proof](../circuits-api/circuits.md#epoch-key-proof)
:::
