---
title: BaseVerifierHelper.sol
---

This is a basic verifier helper contract. It contains signals and error codes used across verifier helper contracts.

## chainid

Get the current chain ID.

## EpochKeySignals

Signals inside a [epoch key proof](../../circuits-api/epoch-key-proof.md) and [epoch key lite proof](../../circuits-api/epoch-key-lite-proof.md).

:::caution
`stateTreeRoot` will be 0 in an epoch key lite proof.
:::

```sol
struct EpochKeySignals {
  uint256 epochKey;
  uint256 stateTreeRoot;
  uint8 nonce;
  uint48 epoch;
  uint160 attesterId;
  bool revealNonce;
  uint48 chainId;
  uint256 data;
}
```

## ReputationSignals

Signals inside a [reputation proof](../../circuits-api/reputation-proof.md).

```sol
struct ReputationSignals {
  uint256 epochKey;
  uint256 stateTreeRoot;
  uint8 nonce;
  uint48 epoch;
  uint160 attesterId;
  bool revealNonce;
  uint48 chainId;
  uint256 minRep;
  uint256 maxRep;
  bool proveMinRep;
  bool proveMaxRep;
  bool proveZeroRep;
  bool proveGraffiti;
  uint256 graffiti;
  uint256 data;
}
```

## decodeEpochKeyControl

Decode an epoch key related control from [epoch key lite proof](../../circuits-api/circuits#epoch-key-lite-proof), [epoch key proof](../../circuits-api/circuits.md#epoch-key-proof), and [reputation proof](../../circuits-api/circuits.md#reputation-proof) into named variables.

```sol
function decodeEpochKeyControl(uint256 control)
    public
    pure
    returns (
      uint8 nonce,
      uint48 epoch,
      uint160 attesterId,
      bool revealNonce,
      uint48 chainId
    )
```

## shift

Get data in certain range of bits.

<table>
  <tbody>
    <tr>
      <th colspan="2">data</th>
    </tr>
    <tr>
      <td>Variable bits</td>
      <td>Shift bits</td>
    </tr>
  </tbody>
</table>

It will return a variable from data within variable bits.

```sol
function shift(
  uint256 data,
  uint8 shiftBits,
  uint8 variableBits
) public pure returns (uint256)
```