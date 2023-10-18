---
title: Default prover
---

A default prover is included that uses prebuilt keys bundled with the package. This prover can be accessed like so:

:::caution

The keys included are not safe for production use. A phase 2 trusted setup needs to be done before use.

:::

```ts
import { Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

await defaultProver.genProofAndPublicSignals(Circuit.proveReputation, { /* inputs */ })
```
