---
title: BaseVerifierHelper.sol
---

This is a basic verifier helper contract. It contains signals and error codes used across verifier helper contracts.

## chainid

Get the current chain ID.

## EpochKeySignals

Signals inside a [epoch key proof](../../circuits-api/classes/src.EpochKeyProof.md) and [epoch key lite proof](../../circuits-api/classes/src.EpochKeyLiteProof.md).

:::caution
`stateTreeRoot` will be 0 in an epoch key lite proof.
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

## ReputationSignals

Signals inside a [reputation proof](../../circuits-api/classes/src.ReputationProof.md).

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

## decodeEpochKeyControl

Decode an epoch key related control from [epoch key lite proof](../../circuits-api/classes/src.EpochKeyLiteProof.md), [epoch key proof](../../circuits-api/classes/src.EpochKeyProof.md), and [reputation proof](../../circuits-api/classes/src.ReputationProof.md) into named variables.

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
function shiftAndParse(
  uint256 data,
  uint8 shiftBits,
  uint8 variableBits
) public pure returns (uint256)
```