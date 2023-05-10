---
title: Reputation Proof Verifier Contract 
---

This smart contract is dedicated to verifying a reputation proof

## decodeReputationControl

Decode a reputation related control from [reputation proof](../circuits-api/circuits.md#prove-reputation-proof) into named variables.

```sol
function decodeReputationControl(uint256 control)
    public
    pure
    returns (
      uint256 minRep,
      uint256 maxRep,
      bool proveMinRep,
      bool proveMaxRep,
      bool proveZeroRep,
      bool proveGraffiti
    )
```

## decodeReputationSignals

Decode the public signals from a [reputation proof](../circuits-api/circuits#prove-reputation-proof) into named variables.

```sol
function decodeReputationSignals(uint256[] memory publicSignals)
    public
    pure
    returns (ReputationSignals memory)
```

```sol
struct ReputationSignals {
    bool proveGraffiti;
    bool proveMinRep;
    bool proveMaxRep;
    bool proveZeroRep;
    bool revealNonce;
    uint8 nonce;
    uint48 epoch;
    uint160 attesterId;
    uint256 stateTreeRoot;
    uint256 epochKey;
    uint256 graffitiPreImage;
    uint256 minRep;
    uint256 maxRep;
}
```

## verifyAndCheck 

Verify a [reputation proof](../circuits-api/circuits#prove-reputation-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
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

Verify a [reputation proof](../circuits-api/circuits#prove-reputation-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid. This is identical to `verifyAndCheck` but also checks that the caller is the attester.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
:::

```sol
function verifyAndCheckCaller(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public
  view
  returns (ReputationSignals memory) 
```
