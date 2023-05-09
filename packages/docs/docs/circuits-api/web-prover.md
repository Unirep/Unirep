---
title: Web Prover
---

The circuits package includes a browser compatible prover. This prover loads the proving keys from a remote URL. By default this url is `https://keys.unirep.io/2-beta-3/`.

The server is expected to serve the `zkey`, `wasm`, and `vkey` files at their respective names in the provided subpath. e.g. for the above url the signup zkey is at `https://keys.unirep.io/2-beta-3/signup.zkey`.

:::caution
The keys included are not safe for production use. A phase 2 trusted setup needs to be done before use.
:::

### Default key server

```ts
import { Circuit } from '@unirep/circuits'
import prover from '@unirep/circuits/provers/web'

await prover.genProofAndPublicSignals(Circuit.signup, { /* inputs */ })
```

### Custom key server

```ts
import { Circuit } from '@unirep/circuits'
import { WebProver } from '@unirep/circuits/provers/web'

// For a local key server
const prover = new WebProver('http://localhost:8000/keys/')
await prover.genProofAndPublicSignals(Circuit.signup, { /* inputs */ })
```
