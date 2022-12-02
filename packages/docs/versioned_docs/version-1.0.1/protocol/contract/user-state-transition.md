# User state transition

There are three steps in user state transition (see [user state transition proof](../circuits/user-state-transition-proof.md)), and they should be performed in order.

## Start user state transition

```solidity title=contracts/Unirep.sol
/**
* @dev User submit a start user state transition proof
* publicSignals[0] = [ globalStateTree ]
* publicSignals[1] = [ blindedUserState ]
* publicSignals[2] = [ blindedHashChain ]
* @param publicSignals The public signals of the start user state transition proof
* @param proof The The proof of the start user state transition proof
*/
function startUserStateTransition(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external 
```

:::info
source: [Unirep.sol/startUserStateTransition](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L538)
:::

## Process attestations

```solidity title=contracts/Unirep.sol
/**
* @dev User submit a process attestations proof
* publicSignals[0] = [ outputBlindedUserState ]
* publicSignals[1] = [ outputBlindedHashChain ]
* publicSignals[2] = [ inputBlindedUserState ]
* @param publicSignals The public signals of the process attestations proof
* @param proof The process attestations proof
*/
function processAttestations(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external
```

:::info
source: [Unirep.sol/processAttestations](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L567)
:::

## User State Transition

```solidity title=contracts/Unirep.sol
/**
* @dev User submit the latest user state transition proof
* publicSignals[0] = [ fromGlobalStateTree ]
* publicSignals[1] = [ newGlobalStateTreeLeaf ]
* publicSignals[2: 2 + numEpochKeyNoncePerEpoch] = [ epkNullifiers ]
* publicSignals[2 + numEpochKeyNoncePerEpoch] = [ transitionFromEpoch ]
* publicSignals[3 + numEpochKeyNoncePerEpoch:
                5+  numEpochKeyNoncePerEpoch] = [ blindedUserStates ]
* publicSignals[5+  numEpochKeyNoncePerEpoch:
                5+2*numEpochKeyNoncePerEpoch] = [ blindedHashChains ]
* publicSignals[5+2*numEpochKeyNoncePerEpoch] = [ fromEpochTree ]
* @param publicSignals The the public signals of the user state transition proof
* @param proof The proof of the user state transition proof
*/
function updateUserStateRoot(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external
```

:::info
source: [Unirep.sol/updateUserStateRoot](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L606)
:::