---
title: Testnet Addresses
---

# Deployment

The UniRep team maintains up to date deployments of the contracts matching our releases.

Latest package versions:
- [@unirep/core@2.0.0-beta-3](https://www.npmjs.com/package/@unirep/core/v/2.0.0-beta-3)
- [@unirep/contracts@2.0.0-beta-3](https://www.npmjs.com/package/@unirep/contracts/v/2.0.0-beta-3)
- [@unirep/circuits@2.0.0-beta-3](https://www.npmjs.com/package/@unirep/circuits/v/2.0.0-beta-3)
- [@unirep/utils@2.0.0-beta-3](https://www.npmjs.com/package/@unirep/utils/v/2.0.0-beta-3)

Our contracts are deployed on the Arbitrum Goerli testnet.

Address: [`0xCa61bFcA0107c5952f8bf59f4D510d111cbcE146`](https://goerli.arbiscan.io/address/0xCa61bFcA0107c5952f8bf59f4D510d111cbcE146)

Contract configuration:

```
State tree depth: 17
Epoch tree depth: 17
History tree depth: 17
Epoch key nonce count: 2
Field count: 6
Sum field count: 4
Replacement nonce bits: 48
```

## Demo Attester

You can interact with a [demo attester](https://demo.unirep.io) to get a feel for the flow of data in the system.

## Epoch Sealing

In beta-3 epochs are automatically sealed onchain. No additional proof or transaction is necessary!

## Keys

Proving keys for this contract can be accessed at the following url:
- [https://keys.unirep.io/2-beta-3/](https://keys.unirep.io/2-beta-3/)

This URL can be directly used in a [network prover](circuits-api/network-prover) implementation.

:::danger
These keys have not had a secure phase 2 trusted setup.

**Use these keys at your own risk.**
:::

Read more about trusted setups:

[https://vitalik.ca/general/2022/03/14/trustedsetup.html](https://vitalik.ca/general/2022/03/14/trustedsetup.html)
