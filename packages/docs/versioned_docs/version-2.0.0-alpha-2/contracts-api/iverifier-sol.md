---
title: IVerifier
---

This is an interface for a generic zk proof verifier. This is the interface UniRep uses for the verifiers stored as contract variables.

## verifyProof

```sol
function verifyProof(
  uint256[] calldata publicSignals,
  uint256[8] calldata proof
)
  external
  view
  returns (bool);
```
