---
title: Epoch Key Proof Verifier Contract
---

This smart contract is dedicated to verifying epoch key proofs. See [IVerifier](iverifier-sol) for more info.
```ts
import { deployProofVerifiers } from '@unirep/contracts/deploy'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Circuit } from '@unirep/circuits'

let proofVerifiers = await deployProofVerifier(accounts[0], Circuit.epochKey) // deploys all proof verification contracts

const r = await defaultProver.genProofAndPublicSignals(
    Circuit.epochKey,
    stringifyBigInts({
    state_tree_elements: merkleProof.siblings,
    state_tree_indexes: merkleProof.pathIndices,
    identity_secret: id.secret,
    data: data,
    sig_data: sig_data,
    epoch,
    nonce,
    attester_id: attester.address,
    reveal_nonce: reveal_noncee,
  })
)

const { publicSignals, proof } = new EpochKeyProof(
  r.publicSignals,
  r.proof
)

// fails or returns proof signals
const signals = await proofVerifiers.epochKey.verifyAndCheck(
    publicSignals,
    proof
) 
```

## decodeEpochKeySignals

Decode the public signals from an [epoch key proof](../circuits-api/circuits#epoch-key-proof) into named variables.

```sol
function decodeEpochKeySignals(uint256[] memory publicSignals)
    public
    pure
    returns (EpochKeySignals memory)
```

```sol
struct EpochKeySignals {
    bool revealNonce;
    uint8 nonce;
    uint48 epoch;
    uint160 attesterId;
    uint256 stateTreeRoot;
    uint256 epochKey;
    uint256 data;
}
```

## verifyAndCheck 

Verify an [epoch key proof](../circuits-api/circuits#epoch-key-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
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

Verify an [epoch key proof](../circuits-api/circuits#epoch-key-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid. This is identical to `verifyAndCheck` but also checks that the caller is the attester.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
:::

```sol
function verifyAndCheckCaller(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public
  view
  returns (EpochKeySignals memory) 
```
