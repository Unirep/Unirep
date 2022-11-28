---
description: Attester sets airdrop amount and users can get airdrop reputation
---

# Airdrop Reputation

## `setAirdropAmount`

```
npx ts-node cli/index.ts setAirdropAmount
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -x CONTRACT 
                  -a AIRDROP 
                  -d ETH_PRIVKEY
```

* The attester that has registered in UniRep can set the airdrop amount and give it to users that register through the attester's account/smart contract.
* UniRep contract will also set the sign up flag to `1`.

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
  -a AIRDROP, --airdrop AIRDROP
                        The amount of airdrop positive reputation given by the attester
  -d ETH_PRIVKEY, --eth-privkey ETH_PRIVKEY
                        The attester's Ethereum private key
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

{% hint style="info" %}
source: [core/cli/setAirdropAmount.ts](https://github.com/Unirep/Unirep/blob/main/packages/core/cli/setAirdropAmount.ts)
{% endhint %}

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
* See [user sign up proof](../circuits/user-sign-up-proof.md)

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

{% hint style="info" %}
source: [core/cli/genUserSignUpProof.ts](https://github.com/Unirep/Unirep/blob/main/packages/core/cli/genUserSignUpProof.ts)
{% endhint %}

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

{% hint style="info" %}
source: [core/cli/verifyUserSignUpProof.ts](https://github.com/Unirep/Unirep/blob/main/packages/core/cli/verifyUserSignUpProof.ts)
{% endhint %}

## `giveAirdrop`

```
npx ts-node cli/index.ts giveAirdrop
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -p PUBLIC_SIGNALS 
                  -pf PROOF 
                  -x CONTRACT 
                  -d ETH_PRIVKEY
```

* After receiving the user sign up proof, the attester knows that the user has been authenticated before and the attester can give the attester the airdrop reputation to let the user spend the reputation.

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -p PUBLIC_SIGNALS, --public-signals PUBLIC_SIGNALS
                        The snark public signals of the user's epoch key
  -pf PROOF, --proof PROOF
                        The snark proof of the user's epoch key
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
  -d ETH_PRIVKEY, --eth-privkey ETH_PRIVKEY
                        The attester's Ethereum private key
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

{% hint style="info" %}
source: [core/cli/giveAirdrop.ts](https://github.com/Unirep/Unirep/blob/main/packages/core/cli/giveAirdrop.ts)
{% endhint %}
