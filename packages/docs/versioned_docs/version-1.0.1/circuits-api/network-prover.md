---
title: Network Prover
---

# Network Prover

This document describes an example [`Prover`](prover) implementation that loads the necessary keys from a remote url. This code is designed for use in a browser environment built with webpack. It takes advantage of code splitting and lazy loading to reduce bundle size.

```js
import { Circuit } from '@unirep/circuits'
import { SnarkPublicSignals, SnarkProof } from '@unirep/utils'

// The keys built for unirep 2.0.0-alpha-2
const KEY_SERVER = 'https://keys.unirep.io/2-alpha-2'

export default {
    verifyProof: async (
        circuitName,
        publicSignals,
        proof
    ) => {
        const snarkjs = await import(/* webpackPrefetch: true */ 'snarkjs')
        const url = new URL(`${circuitName}.vkey.json`, KEY_SERVER)
        const vkey = await fetch(url.toString()).then((r) => r.json())
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    },
    genProofAndPublicSignals: async (
        circuitName,
        inputs
    ) => {
        const snarkjs = await import(/* webpackPrefetch: true */ 'snarkjs')
        const wasmUrl = new URL(`${circuitName}.wasm`, KEY_SERVER)
        const zkeyUrl = new URL(`${circuitName}.zkey`, KEY_SERVER)
        const [ wasm, zkey ] = await Promise.all([
            fetch(wasmUrl.toString()).then((r) =>
              r.arrayBuffer()
            ),
            fetch(zkeyUrl.toString()).then((r) =>
              r.arrayBuffer()
            )
        ])
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            new Uint8Array(wasm),
            new Uint8Array(zkey)
        )
        return { proof, publicSignals }
    },
}
```
