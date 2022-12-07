---
description: How to use UniRep smart contract to verify proofs.
---

# Verify proofs

## Epoch Key Verifier

Verify an [epoch key proof](../circuits/epoch-key-proof.md) with UniRep smart contract.

```solidity title=contracts/Unirep.sol
function verifyEpochKeyValidity(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public view returns (bool)
```

:::info
source: [Unirep.sol/verifyEpochKeyValidity](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L691)
:::

## Reputation Verifier

Verify a [reputation proof](../circuits/reputation-proof.md) with UniRep smart contract.

```solidity title=contracts/Unirep.sol
function verifyReputation(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public view returns (bool)
```

:::info
source: [Unirep.sol/verifyReputation](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L807)
:::

## User Sign Up Verifier

Verify a [user sign up proof](../circuits/user-sign-up-proof.md) with UniRep smart contract.

```solidity title=contracts/Unirep.sol
function verifyUserSignUp(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public view returns (bool)
```

:::info
source: [Unirep.sol/verifyUserSignUp](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L836)
:::

## Start Transition Verifier

Verify a [start transition proof](../circuits/user-state-transition-proof.md#1-start-transition-proof) with UniRep smart contract.

```solidity title=contracts/Unirep.sol
function verifyStartTransitionProof(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

:::info
source: [Unirep.sol/verifyStartTransitionProof](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L718)
:::

## Process Attestations Verifier

Verify a [process attestations proof](../circuits/user-state-transition-proof.md#2-process-attestations-proof) with UniRep smart contract.

```solidity title=contracts/Unirep.sol
function verifyProcessAttestationProof(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

:::info
source: [Unirep.sol/verifyProcessAttestationProof](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L745)
:::

## User State Transition Verifier

Verify a [user state transition proof](../circuits/user-state-transition-proof.md#3-user-state-transition-proof) with UniRep smart contract.

```solidity title=contracts/Unirep.sol
function verifyUserStateTransition(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

:::info
source: [Unirep.sol/verifyUserStateTransition](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L777)
:::
