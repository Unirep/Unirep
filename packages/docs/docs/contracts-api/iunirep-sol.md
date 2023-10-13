---
title: IUnirep.sol
---


## Events

The UniRep contract emits a number of events to help offchain observers track state.

### AttesterSignedUp

Emitted when an attester registers with the UniRep contract.

```sol
event AttesterSignedUp(
    uint160 indexed attesterId,
    uint48 epochLength,
    uint48 timestamp
);
```

### UserSignUp

Emitted when a user joins an attester.

```sol
event UserSignedUp(
    uint48 indexed epoch,
    uint256 indexed identityCommitment,
    uint160 indexed attesterId,
    uint256 leafIndex
);
```

### UserStateTransitioned

Emitted when a user transitions to a new epoch.

```sol
event UserStateTransitioned(
    uint48 indexed epoch,
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
    uint48 indexed epoch,
    uint256 indexed epochKey,
    uint160 indexed attesterId,
    uint256 fieldIndex,
    uint256 change
);
```

### StateTreeLeaf

Emitted when a leaf is added to a state tree.

```sol
event StateTreeLeaf(
    uint48 indexed epoch,
    uint160 indexed attesterId,
    uint256 indexed index,
    uint256 leaf
);
```

### EpochTreeLeaf

Emitted when a leaf in an epoch tree is updated.

```sol
event EpochTreeLeaf(
    uint48 indexed epoch,
    uint160 indexed attesterId,
    uint256 indexed index,
    uint256 leaf
);
```

### HistoryTreeLeaf

Emitted when a leaf is added to the history tree.

```sol
event HistoryTreeLeaf(
    uint160 indexed attesterId,
    uint256 leaf
);
```

### EpochEnded

Emitted when an attester epoch ends.

```sol
event EpochEnded(uint48 indexed epoch, uint160 indexed attesterId);
```

## Structs

### SignupSignals

Public signals of a user signup proof.

```sol
struct SignupSignals {
    uint256 stateTreeLeaf;
    uint48 epoch;
    uint48 chainId;
    uint160 attesterId;
    uint256 identityCommitment;
}
```

### UserStateTransitionSignals

Public signals of a user state transition proof.

```sol
struct UserStateTransitionSignals {
    uint256 historyTreeRoot;
    uint256 stateTreeLeaf;
    uint48 toEpoch;
    uint160 attesterId;
    uint256[] epochKeys;
}
```

### EpochKeyData

`EpochKeyData` saves the current status of an epoch key.

```sol
struct EpochKeyData {
    uint256 leaf;
    uint40 leafIndex;
    uint48 epoch;
    uint256[128] data;
}
```

### AttesterData

The current status of an attester.

```sol
struct AttesterData {
    mapping(uint256 => mapping(uint256 => bool)) stateTreeRoots;
    ReusableTreeData stateTree;
    mapping(uint256 => bool) historyTreeRoots;
    IncrementalTreeData historyTree;
    mapping(uint256 => uint256) epochTreeRoots;
    LazyTreeData epochTree;
    uint48 startTimestamp;
    uint48 currentEpoch;
    uint48 epochLength;
    mapping(uint256 => bool) identityCommitments;
    IncrementalTreeData semaphoreGroup;
    mapping(uint256 => EpochKeyData) epkData;
}
```

### Config

The circuit config.

```sol
struct Config {
    uint8 stateTreeDepth;
    uint8 epochTreeDepth;
    uint8 historyTreeDepth;
    uint8 fieldCount;
    uint8 sumFieldCount;
    uint8 numEpochKeyNoncePerEpoch;
    uint8 replNonceBits;
    uint8 replFieldBits;
}
```