---
description: >-
  Client library for circuit related functions which are used in UniRep
  protocol.
---

# @unirep/circuits

[![](https://camo.githubusercontent.com/5124fc18e7c4eea90190045bc66eddafb19a7b4d93c696e88c65dc530cec9b02/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f70726f6a6563742d756e697265702d626c75652e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep)[![Github license](https://camo.githubusercontent.com/9dc25f9a3042124b664e5c386b48a35246c09e7fa0e514bf151c2034b183ec62/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f756e697265702f756e697265702e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep/blob/master/LICENSE)[![NPM version](https://camo.githubusercontent.com/6a4116015b3d93ff9e23861d2be7960d76c6f9cf5af0920404249a25c39b9ca4/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f762f40756e697265702f63697263756974733f7374796c653d666c61742d737175617265) ](https://www.npmjs.com/package/@unirep/circuits)[![Downloads](https://camo.githubusercontent.com/20f160f10286348d26bfffe691dd6e94d5e44af6028b40eec801230df81740d8/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f646d2f40756e697265702f63697263756974732e7376673f7374796c653d666c61742d737175617265) ](https://npmjs.org/package/@unirep/circuits)[![Linter eslint](https://camo.githubusercontent.com/ed5849d453eb089b4ad8f56f316f492ceef5e7aa5404ee4df4d97ff6cb3f375f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c696e7465722d65736c696e742d3830383066323f7374796c653d666c61742d737175617265266c6f676f3d65736c696e74) ](https://eslint.org/)[![Code style prettier](https://camo.githubusercontent.com/81082ed03d1efb3d135c66d183ce379d0d30a0091d09d472f5e96ab4e2ff4375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f636f64652532307374796c652d70726574746965722d6638626334353f7374796c653d666c61742d737175617265266c6f676f3d7072657474696572)](https://prettier.io/)

## 🛠 Install

### npm or yarn

Install the `@unirep/circuits` package with npm:

```bash
npm i @unirep/circuits
```

or yarn:

```bash
yarn add @unirep/circuits
```

## 📔 Usage

### Prover

**Build a prover for unirep protocol**

```typescript
import * as snarkjs from 'snarkjs'
import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'

const buildPath = 'PATH/TO/CIRCUIT/FOLDER/'

const prover: Prover = {
    genProofAndPublicSignals: async (
        circuitName: string | Circuit,
        inputs: any
    ): Promise<any> => {
        const circuitWasmPath = path.join(buildPath, `${circuitName}.wasm`)
        const zkeyPath = path.join(buildPath, `${circuitName}.zkey`)
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            circuitWasmPath,
            zkeyPath
        )

        return { proof, publicSignals }
    },

    verifyProof: async (
        circuitName: string | Circuit,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ): Promise<boolean> => {
        const vkey = require(path.join(buildPath, `${circuitName}.vkey.json`))
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    },

    getVKey: (name: string | Circuit) => {
        return require(path.join(buildPath, `${name}.vkey.json`))
    }
}
```

**Generate proof and verify it with the above prover**

```typescript
import { Circuit } from '@unirep/circuits'

// See ./test/verifyEpochKey.test.ts for generating circuit inputs
const circuitInputs = {
    identity_nullifier: ...,
    identity_trapdoor: ...,
    user_tree_root: ...,
    ...
}
const { proof, publicSignals } = await prover.genProofAndPublicSignals(
    Circuit.verifyEpochKey,
    circuitInputs
)

const isValid = await prover.verifyProof(
    Circuit.verifyEpochKey,
    publicSignals,
    proof
)
```