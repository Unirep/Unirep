---
title: EpochKeyLiteVerifierHelper.sol
---

A contract address for an epoch key lite verifier helper. See [IVerifier](iverifier-sol.md) for more info.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

```mdx-code-block
<Tabs
    defaultValue="typescript"
    values={[
        {label: 'Typescript/Javascript', value: 'typescript'},
        {label: 'Solidity', value: 'solidity'},
    ]}>
<TabItem value="typescript">
```

```ts title="epochKeyLiteVerifierHelper.ts"
import { deployUnirep, deployVerifierHelper } from '@unirep/contracts/deploy'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Circuit, EpochKeyLiteProof } from '@unirep/circuits'

// deploys epoch key lite verifier helper contract
const unirep = await deployUnirep(accounts[0])
const epochKeyLiteVerifierHelper = await deployVerifierHelper(
  unirep.address, 
  accounts[0], 
  Circuit.epochKeyLite
)

const r = await defaultProver.genProofAndPublicSignals(
  Circuit.epochKeyLite,
  CircuitInputs // see @unirep/circuits to know the whole circuit inputs
)

const { publicSignals, proof } = new EpochKeyLiteProof(
  r.publicSignals,
  r.proof
)

// fails or returns proof signals
const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
  publicSignals,
  proof
) 
```

```mdx-code-block
  </TabItem>
  <TabItem value="solidity">
```

```sol title="App.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EpochKeyLiteVerifierHelper } from '@unirep/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.sol';

contract App {
  // use the deployed helper
  EpochKeyLiteVerifierHelper public helper;
  constructor(
    EpochKeyLiteVerifierHelper _helper
  ) {
    helper = _helper;
  }

  // decode and verify the proofs
  // fails or returns proof signals
  function decodeAndVerify(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
  ) public view returns (EpochKeyLiteVerifierHelper.EpochKeySignals memory) {
    return helper.verifyAndCheck(publicSignals, proof);
  }
}

```

```mdx-code-block
  </TabItem>
</Tabs>
```

## decodeEpochKeyLiteSignals

Decode the public signals from an [epoch key lite proof](../../circuits-api/circuits#epoch-key-lite-proof) info named variables.

```sol
function decodeEpochKeyLiteSignals(uint256[] memory publicSignals)
    public
    pure
    returns (EpochKeySignals memory)
```

:::tip
The `stateTreeRoot` variable in this struct is unused for epoch key lite proofs.
:::

```sol
struct EpochKeySignals {
  uint256 epochKey;
  uint256 stateTreeRoot;
  uint256 data;
  uint160 attesterId;
  uint48 epoch;
  uint48 chainId;
  uint8 nonce;
  bool revealNonce;
}
```

## verifyAndCheck

Verify an [epoch key lite proof](../../circuits-api/circuits#epoch-key-lite-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

:::caution
This function **does not** require the epoch for the proof to be the **current epoch**. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](../unirep-sol.md#attestercurrentepoch).
:::

:::danger
This function does not verify that the `attesterId` is the same as the caller. Thus, we recommend that to either use [verifyAndCheckCaller](#verifyandcheckcaller) or to manually verify the `attesterId`
:::

```sol
function verifyAndCheck(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public
  view
  returns (EpochKeySignals memory) 
```
## verifyAndCheckCaller

Verify an [epoch key lite proof](../../circuits-api/circuits#epoch-key-lite-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid. This is identical to `verifyAndCheck` but also checks that the caller is the attester.

:::caution
This function **does not** require the epoch for the proof to be the **current epoch**. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](../unirep-sol.md#attestercurrentepoch).
:::

```sol
function verifyAndCheckCaller(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public
  view
  returns (EpochKeySignals memory) 
