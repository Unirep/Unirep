---
title: Epoch Key Lite Proof Verifier Contract
---

This smart contract is dedicated to verifying epoch key lite proofs

## decodeEpochKeyLiteSignals

Decode the public signals from an [epoch key lite proof](../circuits-api/circuits#epoch-key-lite-proof) info named variables.

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

Verify an [epoch key lite proof](../circuits-api/circuits#epoch-key-lite-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
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

Verify an [epoch key lite proof](../circuits-api/circuits#epoch-key-lite-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid. This is identical to `verifyAndCheck` but also checks that the caller is the attester.

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
