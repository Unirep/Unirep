---
title: Testnet Addresses
---

# Deployment

The UniRep team maintains up to date deployments of the contracts matching our releases.

Latest package versions:
- [@unirep/core@2.0.0-alpha-3](https://www.npmjs.com/package/@unirep/core/v/2.0.0-alpha-2)
- [@unirep/contracts@2.0.0-alpha-3](https://www.npmjs.com/package/@unirep/contracts/v/2.0.0-alpha-2)
- [@unirep/circuits@2.0.0-alpha-4](https://www.npmjs.com/package/@unirep/circuits/v/2.0.0-alpha-1)
- [@unirep/utils@2.0.0-alpha-4](https://www.npmjs.com/package/@unirep/utils/v/2.0.0-alpha-1)

Our contracts are deployed on the Arbitrum Goerli testnet.

Address: [`0x1F8d7d42b44d9570e5a23F356967A55D1FC8dA26`](https://goerli.arbiscan.io/address/0x1F8d7d42b44d9570e5a23F356967A55D1FC8dA26)

Contract configuration:

```
State tree depth: 20
Epoch tree depth: 25
Epoch tree arity: 14
Aggregate key count: 20
Epoch key nonce count: 3
```

## Keys

Proving keys for this contract can accessed at the following url:
- [https://keys.unirep.io/2-alpha-3/](https://keys.unirep.io/2-alpha-3/)

This URL can be directly used in a [network prover](circuits-api/network-prover) implementation.

:::danger
These keys have not had a secure phase 2 trusted setup. **Use these keys at your own risk.**
:::
