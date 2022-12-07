---
description: Create a user identity with semaphore
---

# User Identity

* Semaphore is a zero-knowledge gadget which allows users to prove their membership of a set without revealing their original identity.
* We use [semaphore](https://github.com/semaphore-protocol/semaphore) here to generate users' identity and the identity commitment. Users can send their identity commitment instead of their semaphore identity to sign up.
* Only a user has the semaphore identity and the identity commitment has signed up on the Unirep contract, the user can perform actions in the Unirep protocol.

:::info
This function does not require users connect to an Ethereum provider.
:::

## `genUnirepIdentity`

```bash
npx ts-node cli/index.ts genUnirepIdentity [-h]
```

* base64url encoded identity and identity commitment will be printed
* A string with `Unirep.identity` prefix is user's semaphore identity
* A string with `Unirep.identityCommitment` prefix is user's semaphore identity commitment

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/genUnirepIdentity.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/genUnirepIdentity.ts)
:::
