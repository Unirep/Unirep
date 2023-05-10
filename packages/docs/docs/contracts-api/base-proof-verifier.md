---
title: Base Proof Verifier Contract
---

This is a basic proof verification contract. It contains signals and error codes used across proof verification contracts.

## decodeEpochKeyControl

Decode a epoch key related control from [epoch key lite proof](../circuits-api/circuits#epoch-key-lite-proof), [epoch key proof](../circuits-api/circuits.md#epoch-key-proof), and [reputation proof](../circuits-api/circuits.md#prove-reputation-proof) into named variables.

```sol
function decodeEpochKeyControl(uint256 control)
    public
    pure
    returns (
      uint256 revealNonce,
      uint256 attesterId,
      uint256 epoch,
      uint256 nonce
    )
```
