---
title: BaseProof
---

We build proofs using a `BaseProof` class that optionally supports verification. Proof data can be expressed in one of two formats:

1. `SnarkProof` objects for verification by `snarkjs`
2. `BigNumberish[]` for contract verification.

The `BaseProof` class can be used to convert between the two formats. This class should not be used directly, but should instead be inherited.

```ts
import { BaseProof } from '@unirep/circuits'

class MyCustomProof extends BaseProof {
  constructor(publicSignals, proof, prover) {
    super(publicSignals, proof, prover)

    // Specify a circuit name for the Prover
    // This is typically a filename
    this.circuit = 'MyCustomProof'
  }
}
```

## BaseProof

The base class for a proof that can be verified using a [`Prover`](prover).

## constructor

Create a new instance of the class.

```ts
constructor(
  publicSignals: BigNumberish[],
  proof: SnarkProof | BigNumberish[],
  prover?: Prover
)
```

## \_snarkProof

The proof data in `SnarkProof` format. Use this when manually verifying with `snarkjs`.

```ts
proof._snarkProof
```

## circuit

The string name of the type of circuit this proof came from. For the `BaseProof` class this is undefined.

```ts
proof.circuit
```

## publicSignals

The raw array of public signals for the proof.

```ts
proof.publicSignals
```

## proof

The proof data formatted as `BigNumberish[]`. Use this property when interacting with smart contracts.

```ts
proof.proof
```

## verify

A function to verify the proof with the supplied `Prover`. The `prover` property must be set either in the constructor, or manually otherwise this will throw.

```ts
proof.verify(): Promise<boolean>
```

## hash

Calculate a Solidity Keccak256 hash for the proof. This is the equivalent of `keccak256(abi.encode(publicSignals, proof))` in Solidity.

```ts
proof.hash(): string
```
