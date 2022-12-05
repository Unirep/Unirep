---
description: User generates an epoch key and a proof of this epoch key
---

# Epoch Key And Proof

* An epoch key is the only way that a user can receive reputation.
* A user can generate an epoch key with a nonce, the nonce should be less than `numEpochKeyNoncePerEpoch`.
* A user generates the epoch key with a circom circuit and the epoch key and proof can be verified by attesters and other users.

## `genEpochKeyAndProof`

```
npx ts-node cli/index.ts genEpochKeyAndProof 
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -id IDENTITY 
                  -n EPOCH_KEY_NONCE 
                  -x CONTRACT
```

* epoch key and base64url encoded epoch key proof and public signals will be printed
* A string with `Unirep.epk.proof` prefix is the proof of this epoch key
* A string with `Unirep.epk.publicSignals` prefix is the public signals of this proof The public signals includes
  * the current epoch
  * the epoch key
  * the global state tree root.
* Attesters and other users can verify if the epoch key is in the current epoch and if the user has a leaf in the global state tree.

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -id IDENTITY, --identity IDENTITY
                        The (serialized) user's identity
  -n EPOCH_KEY_NONCE, --epoch-key-nonce EPOCH_KEY_NONCE
                        The epoch key nonce
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/genEpochKeyAndProof.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/genEpochKeyAndProof.ts)
:::

## `verifyEpochKeyProof`

```
npx ts-node cli/index.ts verifyEpochKeyProof 
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -p PUBLIC_SIGNALS 
                  -pf PROOF 
                  -x CONTRACT
```

* This command will help other users with an epoch key proof with `Unirep.epk.proof` prefix and it public signals with `Unirep.epk.publicSignals` prefix to call the Unirep smart contract to verify the proof.

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
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/verifyEpochKeyProof.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/verifyEpochKeyProof.ts)
:::