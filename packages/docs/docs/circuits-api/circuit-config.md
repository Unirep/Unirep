---
title: CircuitConfig
---

Use the default circuit config like so:

```ts
import { CircuitConfig } from '@unirep/circuits'
const { 
    STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    HISTORY_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    SUM_FIELD_COUNT,
    REPL_NONCE_BITS,
    SNARK_SCALAR_FIELD,
    EPOCH_BITS,
    NONCE_BITS,
    ATTESTER_ID_BITS,
    CHAIN_ID_BITS,
    REVEAL_NONCE_BITS,
    REP_BITS,
    ONE_BIT
} = CircuitConfig.default
```

:::info
See current deployment config: [testnet-deployment](../testnet-deployment.mdx)
:::