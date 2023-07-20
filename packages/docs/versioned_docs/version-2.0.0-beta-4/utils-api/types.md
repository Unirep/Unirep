---
title: "Snark types"
---

## SnarkPublicSignals

Type of snark public signals.

```ts
type SnarkPublicSignals = bigint[]
```

## SnarkProof

Interface of snark proof.

```ts
interface SnarkProof {
    pi_a: bigint[]
    pi_b: bigint[][]
    pi_c: bigint[]
}
```