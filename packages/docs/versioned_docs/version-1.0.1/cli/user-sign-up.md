---
description: User and attester sign up
---

# User Sign Up

* There are two different actors in Unirep: _**user**_ and _**attester**_
* A _**user**_ with a semaphore identity can generate an epoch key without revealing the semaphore identity and identity commitment
* An _**attester**_ is associated with his Ethereum account or a smart contract. When an attester sign up, the attester has a unique attester id, and whenever the attester submit attestations, other users will know the attestation comes from which attester id.

## `userSignup`

```
npx ts-node cli/index.ts userSignUp 
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -c IDENTITY_COMMITMENT 
                  -x CONTRACT 
                  -d ETH_PRIVKEY
                  [-a AIRDROP]
```

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -c IDENTITY_COMMITMENT, --identity-commitment IDENTITY_COMMITMENT
                        The user's identity commitment (in hex representation)
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
  -d ETH_PRIVKEY, --eth-privkey ETH_PRIVKEY
                        The user's Ethereum private key
  -a AIRDROP, --airdrop AIRDROP
                        The requested airdrop amount
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/userSignUp.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/userSignUp.ts)
:::

## `attesterSignUp`

```
npx ts-node cli/index.ts attesterSignUp 
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -x CONTRACT 
                  -d ETH_PRIVKEY
```

* When an attester signs up, the Unirep smart contract will record the address of the attester and assign an attester id to the attester.
* The attester id will start indexing from 1.

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
  -d ETH_PRIVKEY, --eth-privkey ETH_PRIVKEY
                        The attester's Ethereum private keyhin
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/attesterSignUp.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/attesterSignUp.ts)
:::
