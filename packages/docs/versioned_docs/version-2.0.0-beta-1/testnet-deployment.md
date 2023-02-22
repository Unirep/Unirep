---
title: Testnet Addresses
---

# Deployment

The UniRep team maintains up to date deployments of the contracts matching our releases.

Latest package versions:
- [@unirep/core@2.0.0-beta-1](https://www.npmjs.com/package/@unirep/core/v/2.0.0-beta-1)
- [@unirep/contracts@2.0.0-beta-1](https://www.npmjs.com/package/@unirep/contracts/v/2.0.0-beta-1)
- [@unirep/circuits@2.0.0-beta-1](https://www.npmjs.com/package/@unirep/circuits/v/2.0.0-beta-1)
- [@unirep/utils@2.0.0-beta-1](https://www.npmjs.com/package/@unirep/utils/v/2.0.0-beta-1)

Our contracts are deployed on the Arbitrum Goerli testnet.

Address: [`0x6354F74F29982190B0a830Ac46E279B03d5e169c`](https://goerli.arbiscan.io/address/0x6354F74F29982190B0a830Ac46E279B03d5e169c)

Contract configuration:

```
State tree depth: 12
Epoch tree arity: 10
Epoch tree depth: 3
Epoch key nonce count: 3
Field count: 8
Sum field count: 4
```

## Demo Attester

You can interact with a [demo attester](https://demo.unirep.io) to get a feel for the flow of data in the system.

## Epoch Sealing

Every epoch with attestations must be sealed using an [ordered tree proof](./circuits-api/circuits#build-ordered-tree). This proof is large and best made with `rapidsnark`. We have a repo containing a docker image that will watch the blockchain and automatically build and submit the proof.

For the Arbitrum testnet deployment above we will generate proofs and seal all epochs that need it automatically. This may take 10-60 seconds depending on traffic.

## Keys

Proving keys for this contract can be accessed at the following url:
- [https://keys.unirep.io/2-beta-1/](https://keys.unirep.io/2-beta-1/)

This URL can be directly used in a [network prover](circuits-api/network-prover) implementation.

:::danger
These keys have not had a secure phase 2 trusted setup.

**Use these keys at your own risk.**
:::

Read more about trusted setups:

[https://vitalik.ca/general/2022/03/14/trustedsetup.html](https://vitalik.ca/general/2022/03/14/trustedsetup.html)
