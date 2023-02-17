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

## attest

Create an attestation to an epoch key. If the current epoch is not the same as `targetEpoch` the transaction will revert.

Apply a change to a user data field at index `fieldIndex`. Changes will be applied using either addition or replacement, depending on which field is selected.

:::caution
`msg.sender` must be the attester.
:::

```sol
function attest(
  uint epochKey,
  uint targetEpoch,
  uint fieldIndex,
  uint change
) public
```

## sealEpoch

Finalize an epoch by submitting a [build ordered tree](../circuits-api/circuits#build-ordered-tree) proof. This will set the epoch tree root for the epoch. This must be called _after_ an epoch ends. If no attestations occur in an epoch this _must not_ be called.

```sol
function sealEpoch(
  uint256 epoch,
  uint160 attesterId,
  uint256[] memory publicSignals,
  uint256[8] memory proof
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

## decodeReputationControl

Decode a reputation related control from [reputation proof](../circuits-api/circuits.md#prove-reputation-proof) into named variables.

```sol
function decodeReputationControl(uint256 control)
    public
    pure
    returns (
      uint256 minRep,
      uint256 maxRep,
      uint256 proveMinRep,
      uint256 proveMaxRep,
      uint256 proveZeroRep,
      uint256 proveGraffiti
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
    uint256 stateTreeRoot;
    uint256 epochKey;
    uint256 graffitiPreImage;
    uint256 proveGraffiti;
    uint256 nonce;
    uint256 epoch;
    uint256 attesterId;
    uint256 revealNonce;
    uint256 proveMinRep;
    uint256 proveMaxRep;
    uint256 proveZeroRep;
    uint256 minRep;
    uint256 maxRep;
}
```

## verifyReputationProof

Verify a [reputation proof](../circuits-api/circuits#prove-reputation-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
:::

```sol
function verifyReputationProof(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) public;
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
    uint256 revealNonce;
    uint256 stateTreeRoot;
    uint256 epochKey;
    uint256 data;
    uint256 nonce;
    uint256 epoch;
    uint256 attesterId;
}
```

## verifyEpochKeyProof

Verify an [epoch key proof](../circuits-api/circuits#epoch-key-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
:::

```sol
function verifyEpochKeyProof(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) public;
```

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
    uint256 revealNonce;
    uint256 stateTreeRoot;
    uint256 epochKey;
    uint256 data;
    uint256 nonce;
    uint256 epoch;
    uint256 attesterId;
}
```

## verifyEpochKeyLiteProof

Verify an [epoch key lite proof](../circuits-api/circuits#epoch-key-lite-proof) and validate the public signals against the onchain state. This function will revert if any inputs are invalid.

:::caution
This function does not require the epoch for the proof to be the current epoch. The user may generate a valid proof for a past epoch. If you require the proof to be for the current epoch you should add an additional check using [`attesterCurrentEpoch`](#attestercurrentepoch).
:::

```sol
function verifyEpochKeyLiteProof(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) public;
```

## epochKeyVerifier

A contract address for an epoch key proof verifier. See [IVerifier](iverifier-sol) for more info.

:::danger
Using the verifier directly does not validate the output state root, attester id, or epoch. Prefer the [`EpochKeyProof`](#epochkeyproof) function unless you know what you are doing.
:::

```sol
IVerifier public immutable epochKeyVerifier;
```

Example use:

```sol
bool valid = unirep.epochKeyVerifier.verifyProof(publicSignals, proof);
```

## epochKeyLiteVerifier

A contract address for an epoch key lite proof verifier. See [IVerifier](/docs/contracts-api/iverifier-sol) for more info.

:::warning
Using the verifier directly does not validate the output state root, attester id, or epoch. Prefer the [`verifyEpochKeyProof`](#verifyepochkeyproof) function unless you know what you are doing.
:::

```sol
IVerifier public immutable epochKeyLiteVerifier;
```

Example use:

```sol
bool valid = unirep.epochKeyLiteVerifier.verifyProof(publicSignals, proof);
```

## signupVerifier

A contract address for a signup proof verifier. See [IVerifier](iverifier-sol) for more info.

```sol
IVerifier public immutable signupVerifier;
```

## reputationVerifier

A contract address for a reputation proof verifier. See [IVerifier](iverifier-sol) for more info.

:::danger
Using the verifier directly does not validate the output state root, attester id, or epoch. Prefer the [`verifyReputationProof`](#verifyreputationproof) function unless you know what you are doing.
:::

```sol
IVerifier public immutable reputationVerifier;
```

## userStateTransitionVerifier

A contract address for a user state transition proof verifier. See [IVerifier](iverifier-sol) for more info.

```sol
IVerifier public immutable userStateTransitionVerifier;
```

## buildOrderedTreeVerifier

A contract address for an build ordered tree proof verifier. See [IVerifier](iverifier-sol) for more info.

```sol
IVerifier public immutable buildOrderedTreeVerifier;
```

## attesterStartTimestamp

Get the start timestamp for an attester (in seconds). This is the start of the 0th epoch.

```sol
function attesterStartTimestamp(uint160 attesterId)
  public
  view
  returns (uint256)
```

## attesterEpochSealed

Get a boolean indicating whether or not an epoch for an attester is sealed. Once the epoch is sealed users may execute user state transitions from the epoch.

```sol
function attesterEpochSealed(uint160 attesterId, uint256 epoch)
  public
  view
  returns (bool)
```

## attesterEpochLength

Get the epoch length for an attester.

```sol
function attesterEpochLength(uint160 attesterId)
  public
  view
  returns (uint256)
```

## attesterStateTreeRootExists

Check if a state tree root exists for an attester and epoch.

```sol
function attesterStateTreeRootExists(uint160 attesterId, uint256 epoch, uint256 root)
  public
  view
  returns (bool)
```

## attesterStateTreeRoot

Get the state tree root for an attester for an epoch.

```sol
function attesterStateTreeRoot(uint160 attesterId, uint256 epoch)
  public
  view
  returns (uint256)
```

## attesterStateTreeLeafCount

Get the number of state tree leaves for an attester for an epoch.

```sol
function attesterStateTreeLeafCount(uint160 attesterId, uint256 epoch)
  public
  view
  returns (uint256)
```

## attesterSemaphoreGroupRoot

Get the semaphore group root for an attester.

```sol
function attesterSemaphoreGroupRoot(uint160 attesterId)
  public
  view
  returns (uint256)
```

## attesterMemberCount

Get the number of members in the attester semaphore group.

```sol
function attesterMemberCount(uint160 attesterId)
  public
  view
  returns (uint256)
```

## attesterEpochRoot

Get the epoch tree root for an attester for a certain epoch.

```sol
function attesterEpochRoot(uint160 attesterId, uint256 epoch)
  public
  view
  returns (uint256)
```

## stateTreeDepth

Get the state tree depth for the Unirep contract.

```sol
function stateTreeDepth() public view returns (uint8)
```

## epochTreeDepth

Get the epoch tree depth for the Unirep contract.

```sol
function epochTreeDepth() public view returns (uint8)
```

## epochTreeArity

Get the epoch tree arity for the Unirep contract.

```sol
function epochTreeArity() public view returns (uint8)
```

## numEpochKeyNoncePerEpoch

Get the maximum nonce value for an epoch key. This determines the number of epoch keys per epoch.

```sol
function numEpochKeyNoncePerEpoch() public view returns (uint8)
```

## fieldCount

The number of data fields each user has in this Unirep deployment.

```sol
function fieldCount() public view returns (uint8)
```

## sumFieldCount

How many of the data fields are combined with addition. The sum fields are the first `sumFieldCount` fields in the user data.

```sol
function sumFieldCount() public view returns (uint8)
```

## Events

The UniRep contract emits a number of events to help offchain observers track state.

### AttesterSignedUp

Emitted when an attester registers with the unirep contract.

```sol
event AttesterSignedUp(
  uint160 indexed attesterId,
  uint256 indexed epochLength
);
```

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

### Attestation

Emitted when an attester makes an attestation to an epoch key.

```sol
event Attestation(
    uint256 indexed epoch,
    uint256 indexed epochKey,
    uint160 indexed attesterId,
    uint256 fieldIndex,
    uint256 change,
    uint256 timestamp
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

### EpochSealed

Emitted when an epoch is sealed.

```sol
event EpochSealed(uint256 indexed epoch, uint160 indexed attesterId);
```
