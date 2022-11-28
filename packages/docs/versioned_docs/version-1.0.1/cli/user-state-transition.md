---
description: Users should call user state transition to receive reputation
---

# User state transition

## `userStateTransition`

```
npx ts-node cli/index.ts userStateTransition
                  [-h] 
                  [-e ETH_PROVIDER] 
                  -id IDENTITY 
                  -x CONTRACT 
                  -d ETH_PRIVKEY
```

* It will generate [start transition proof](../circuits/user-state-transition-proof.md#1.-start-transition-proof), [process attestations proof](../circuits/user-state-transition-proof.md#2.-process-attestations-proof)s, and the [user state transition proof](../circuits/user-state-transition-proof.md#3.-user-state-transition-proof).

### Options

```
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -id IDENTITY, --identity IDENTITY
                        The (serialized) user's identity
  -x CONTRACT, --contract CONTRACT
                        The Unirep contract address
  -d ETH_PRIVKEY, --eth-privkey ETH_PRIVKEY
                        The user's Ethereum private key
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

{% hint style="info" %}
source: [core/cli/userStateTransition.ts](https://github.com/Unirep/Unirep/blob/main/packages/core/cli/userStateTransition.ts)
{% endhint %}
