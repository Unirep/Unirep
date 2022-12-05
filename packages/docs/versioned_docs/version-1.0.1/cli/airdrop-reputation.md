---
description: Attester sets airdrop amount and users can get airdrop reputation
---

# Airdrop Reputation

## `genUserSignUpProof`

```
npx ts-node cli/index.ts genUserSignUpProof
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -id IDENTITY 
                  -a ATTESTER_ID 
                  -x CONTRACT
```

* Attester can give user a sign up flag to indicate the user is one of the membership of the attester's application (or event).
* Then user can generate a sign up proof to show that he has been authenticated by the attester.
* See [user sign up proof](../protocol/circuits/user-sign-up-proof.md)

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -id IDENTITY, --identity IDENTITY
                        The (serialized) user's identity
  -a ATTESTER_ID, --attester-id ATTESTER_ID
                        The attester id (in hex representation)
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/genUserSignUpProof.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/genUserSignUpProof.ts)
:::

## `verifyUserSignUpProof`

```
npx ts-node cli/index.ts verifyUserSignUpProof
                  [-h] 
                  [-e ETH_PROVIDER] 
                  [-ep EPOCH] 
                  -p PUBLIC_SIGNALS 
                  -pf PROOF 
                  -x CONTRACT
```

* ### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -ep EPOCH, --epoch EPOCH
                        The latest epoch user transitioned to. Default: current epoch
  -p PUBLIC_SIGNALS, --public-signals PUBLIC_SIGNALS
                        The snark public signals of the user's epoch key
  -pf PROOF, --proof PROOF
                        The snark proof of the user's epoch key
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/verifyUserSignUpProof.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/verifyUserSignUpProof.ts)
:::