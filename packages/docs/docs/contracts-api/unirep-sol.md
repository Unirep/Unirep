---
title: UniRep contract
---

This is the core UniRep contract.

```sol
import { Unirep } from '@unirep/contracts/Unirep.sol';
```

## userSignUp

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

## attesterSignUp

Register an attester contract. `msg.sender` will become an attester.

:::tip
The `attesterId` is the address of the attester contract. In this case `msg.sender`.
:::

```sol
function attesterSignUp(uint epochLength) public
```

## submitAttestation

Create an attestation to an epoch key. If the current epoch is not the same as `targetEpoch` the transaction will revert.

:::caution
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

## buildHashchain

Create a hashchain of epoch key balance updates that can be used to update the epoch root.

```sol
function buildHashchain(uint160 attesterId) public
```

## processHashchain

Update the epoch tree root using a ZK proof and a hashchain.

```sol
function processHashchain(
  uint[] memory publicSignals,
  uint[8] memory proof
) public
```

## userStateTransition

Execute a user state transition using a ZK proof. This will insert a new state tree leaf in the current epoch.

```sol
function userStateTransition(
  uint[] memory publicSignals,
  uint[8] memory proof
) public
```

## attesterCurrentEpoch

Get the current epoch number for an attester.

```sol
function attesterCurrentEpoch(
  uint160 attesterId
) public view returns (uint)
```

## attesterEpochRemainingTime

Get the remaining time, in seconds, for the current epoch for an attester.

```sol
function attesterEpochRemainingTime(
  uint160 attesterId
) public view returns (uint)
```

## signupVerifier

A contract address for a signup proof verifier.

```sol
IVerifier public signupVerifier;
```

## reputationVerifier

A contract address for a reputation proof verifier.

```sol
IVerifier public reputationVerifier;
```

## userStateTransitionVerifier

A contract address for a user state transition proof verifier.

```sol
IVerifier public userStateTransitionVerifier;
```

## aggregateEpochKeysVerifier

A contract address for an aggregate epoch keys proof verifier.

```sol
IVerifier public aggregateEpochKeysVerifier;
```

## Events

The UniRep contract emits a number of events to help offchain observers track state.

### UserSignUp

Emitted when a user joins an attester.

```sol
event UserSignedUp(
    uint256 indexed epoch,
    uint256 indexed identityCommitment,
    uint160 indexed attesterId,
    uint256 leafIndex
);
```

### UserStateTransitioned

Emitted when a user transitions to a new epoch.

```sol
event UserStateTransitioned(
    uint256 indexed epoch,
    uint160 indexed attesterId,
    uint256 indexed leafIndex,
    uint256 hashedLeaf,
    uint256 nullifier
);
```

### AttestationSubmitted

Emitted when an attester makes an attestation to an epoch key.

```sol
event AttestationSubmitted(
    uint256 indexed epoch,
    uint256 indexed epochKey,
    uint160 indexed attesterId,
    uint256 posRep,
    uint256 negRep
);
```

### StateTreeLeaf

Emitted when a leaf is added to a state tree.

```sol
event StateTreeLeaf(
    uint256 indexed epoch,
    uint160 indexed attesterId,
    uint256 indexed index,
    uint256 leaf
);
```

### EpochTreeLeaf

Emitted when a leaf in an epoch tree is updated.

```sol
event EpochTreeLeaf(
    uint256 indexed epoch,
    uint160 indexed attesterId,
    uint256 indexed index,
    uint256 leaf
);
```

### EpochEnded

Emitted when an attester epoch ends.

```sol
event EpochEnded(uint256 indexed epoch, uint160 indexed attesterId);
```
