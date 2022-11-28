---
description: Attester gives reputation to an epoch key
---

# Attestation

## `attest`

```
npx ts-node cli/index.ts attest
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -toi TO_PROOF_INDEX 
                  [-fromi FROM_PROOF_INDEX] 
                  -epk EPOCH_KEY 
                  [-pr POS_REP] 
                  [-nr NEG_REP] 
                  [-gf GRAFFITI]
                  [-s SIGN_UP] 
                  -x CONTRACT 
                  -d ETH_PRIVKEY
```

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -toi TO_PROOF_INDEX, --to-proof-index TO_PROOF_INDEX
                        The proof index of the receiver's epoch key
  -fromi FROM_PROOF_INDEX, --from-proof-index FROM_PROOF_INDEX
                        The proof index of the sender's epoch key
  -epk EPOCH_KEY, --epoch-key EPOCH_KEY
                        The user's epoch key to attest to (in hex representation)
  -pr POS_REP, --pos-rep POS_REP
                        Score of positive reputation to give to the user
  -nr NEG_REP, --neg-rep NEG_REP
                        Score of negative reputation to give to the user
  -gf GRAFFITI, --graffiti GRAFFITI
                        Graffiti for the reputation given to the user (in hex representation)
  -s SIGN_UP, --sign-up SIGN_UP
                        Whether to set sign up flag to the user
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
source: [core/cli/attest.ts](https://github.com/Unirep/Unirep/blob/main/packages/core/cli/attest.ts)
{% endhint %}
