---
description: User can generate reputation proof to claim how much reputation he has
---

# Reputation Proof

## `genReputationProof`

```
npx ts-node cli/index.ts genReputationProof
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -id IDENTITY 
                  -n EPOCH_KEY_NONCE 
                  -a ATTESTER_ID 
                  [-r REPUTATION_NULLIFIER] 
                  [-mr MIN_REP]
                  [-gp GRAFFITI_PREIMAGE] 
                  -x CONTRACT
```

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -id IDENTITY, --identity IDENTITY
                        The (serialized) user's identity
  -n EPOCH_KEY_NONCE, --epoch-key-nonce EPOCH_KEY_NONCE
                        The epoch key nonce
  -a ATTESTER_ID, --attester-id ATTESTER_ID
                        The attester id (in hex representation)
  -r REPUTATION_NULLIFIER, --reputation-nullifier REPUTATION_NULLIFIER
                        The number of reputation nullifiers to prove
  -mr MIN_REP, --min-rep MIN_REP
                        The minimum positive score minus negative score the attester given to the user
  -gp GRAFFITI_PREIMAGE, --graffiti-preimage GRAFFITI_PREIMAGE
                        The pre-image of the graffiti for the reputation the attester given to the user (in hex representation)
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract addressin
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/genReputationProof.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/genReputationProof.ts)
:::

## `verifyReputationProof`

```
npx ts-node cli/index.ts verifyReputationProof
                  [-h] 
                  [-e ETH_PROVIDER] 
                  [-ep EPOCH] 
                  -p PUBLIC_SIGNALS 
                  -pf PROOF 
                  -x CONTRACT
```

* This command will help other users with reputation proof with `Unirep.reputation.proof` prefix and it public signals with `Unirep.reputation.publicSignals` prefix to call the Unirep smart contract to verify the proof.

### Options

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
source: [core/cli/verifyReputationProof.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/verifyReputationProof.ts)
:::
