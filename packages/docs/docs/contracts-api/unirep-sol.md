---
title: UniRep contract
---

This is the core UniRep contract.

```sol
import { Unirep } from '@unirep/contracts/Unirep.sol';
```

### userSignUp

Submit a signup zk proof for a user.

:::caution
`msg.sender` must be the attester.
:::

```sol
function userSignUp(
  uint[] memory publicSignals,
  uint[8] memory proof
) public
```

### attesterSignUp

Register an attester contract. `msg.sender` will become an attester.

:::caution
The `attesterId` is the address of the attester contract. In this case `msg.sender`.
:::

```sol
function attesterSignUp(uint epochLength) public
```

### submitAttestation

Create an attestation to an epoch key. If the current epoch is not the same as `targetEpoch` the transaction will revert.

:::tip
`msg.sender` must be the attester.
:::

```sol
function submitAttestation(
  uint targetEpoch,
  uint epochKey,
  uint posRep,
  uint negRep,
  uint graffiti
) public
```

### buildHashchain

Create a hashchain of epoch key balance updates that can be used to update the epoch root.

```sol
function buildHashchain(uint160 attesterId) public
```

### processHashchain

Update the epoch tree root using a ZK proof and a hashchain.

```sol
function processHashchain(
  uint[] memory publicSignals,
  uint[8] memory proof
) public
```

### userStateTransition

Execute a user state transition using a ZK proof. This will insert a new state tree leaf in the current epoch.

```sol
function userStateTransition(
  uint[] memory publicSignals,
  uint[8] memory proof
) public
```

### attesterCurrentEpoch

Get the current epoch number for an attester.

```sol
function attesterCurrentEpoch(
  uint160 attesterId
) public view returns (uint)
```

### attesterEpochRemainingTime

Get the remaining time, in seconds, for the current epoch for an attester.

```sol
function attesterEpochRemainingTime(
  uint160 attesterId
) public view returns (uint)
```
