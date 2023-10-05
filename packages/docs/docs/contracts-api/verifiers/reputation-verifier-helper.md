---
title: ReputationVerifierHelper.sol
---

A contract address for a reputation verifier helper. See [IVerifier](iverifier-sol) for more info.

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

```ts title="reputationVerifierHelper.ts"
import { deployUnirep, deployVerifierHelper } from '@unirep/contracts/deploy'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Circuit, ReputationProof } from '@unirep/circuits'

// deploys reputation verifier helper contract
const reputationVerifierHelper = await deployVerifierHelper(
  unirep.address,
  accounts[0],
  Circuit.reputation
)

const r = await defaultProver.genProofAndPublicSignals(
  Circuit.reputation,
  CircuitInputs // see @unirep/circuits to know the whole circuit inputs
)

const { publicSignals, proof } = new ReputationProof(
  r.publicSignals,
  r.proof
)

// fails or returns proof signals
const signals = await reputationVerifierHelper.verifyAndCheck(
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

import { ReputationVerifierHelper } from '@unirep/contracts/verifierHelpers/ReputationVerifierHelper.sol';

contract App {
  // use the deployed helper
  ReputationVerifierHelper public helper;
  constructor(
    ReputationVerifierHelper _helper
  ) {
    helper = _helper;
  }

  // decode and verify the proofs
  // fails or returns proof signals
  function decodeAndVerify(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
  ) public view returns (ReputationVerifierHelper.ReputationSignals memory) {
    return helper.verifyAndCheck(publicSignals, proof);
  }
}

```

```mdx-code-block
  </TabItem>
</Tabs>
```

## decodeReputationControl

Decode a reputation related control from [reputation proof](../../circuits-api/circuits.md#reputation-proof) into named variables.

```sol
function decodeReputationControl(uint256 control)
    public
    pure
    returns (
      uint64 minRep,
      uint64 maxRep,
      bool proveMinRep,
      bool proveMaxRep,
      bool proveZeroRep,
      bool proveGraffiti
    )
```

## decodeReputationSignals

Decode the public signals from a [reputation proof](../../circuits-api/circuits#reputation-proof) into named variables.

```sol
function decodeReputationSignals(uint256[] memory publicSignals)
    public
    pure
    returns (ReputationSignals memory)
```

```sol
struct ReputationSignals {
  uint256 epochKey;
  uint256 stateTreeRoot;
  uint256 minRep;
  uint256 maxRep;
  uint256 graffiti;
  uint256 data;
  uint160 attesterId;
  uint48 epoch;
  uint48 chainId;
  uint8 nonce;
  bool revealNonce;
  bool proveMinRep;
  bool proveMaxRep;
  bool proveZeroRep;
  bool proveGraffiti;
}
```

## verifyAndCheck 

Verify a [reputation proof](../../circuits-api/circuits#reputation-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

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
  returns (ReputationSignals memory) 
```

## verifyAndCheckCaller

Verify a [reputation proof](../../circuits-api/circuits#reputation-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid. This is identical to `verifyAndCheck` but also checks that the caller is the attester.

:::caution
This function **does not** require the epoch for the proof to be the **current epoch**. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](../unirep-sol.md#attestercurrentepoch).
:::

```sol
function verifyAndCheckCaller(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public
  view
  returns (ReputationSignals memory) 
```