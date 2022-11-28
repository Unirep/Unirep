---
description: How to use UniRep smart contract to verify proofs.
---

# Verify proofs

## Epoch Key Verifier

Verify an [epoch key proof](../../circuits/epoch-key-proof.md) with UniRep smart contract.

```solidity
function verifyEpochKeyValidity(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

{% hint style="info" %}
source: [Unirep.sol/verifyEpochKeyValidity](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L630)
{% endhint %}

## Reputation Verifier

Verify a [reputation proof](../../circuits/reputation-proof.md) with UniRep smart contract.

```solidity
function verifyReputation(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

{% hint style="info" %}
source: [Unirep.sol/verifyReputation](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L746)
{% endhint %}

## User Sign Up Verifier

Verify a [user sign up proof](../../circuits/user-sign-up-proof.md) with UniRep smart contract.

```solidity
function verifyUserSignUp(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

{% hint style="info" %}
source: [Unirep.sol/verifyUserSignUp](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L775)
{% endhint %}

## Start Transition Verifier

Verify a [start transition proof](../../circuits/user-state-transition-proof.md#1.-start-transition-proof) with UniRep smart contract.

```solidity
function verifyStartTransitionProof(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

{% hint style="info" %}
source: [Unirep.sol/verifyStartTransitionProof](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L657)
{% endhint %}

## Process Attestations Verifier

Verify a [process attestations proof](../../circuits/user-state-transition-proof.md#2.-process-attestations-proof) with UniRep smart contract.

```solidity
function verifyProcessAttestationProof(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

{% hint style="info" %}
source: [Unirep.sol/verifyProcessAttestationProof](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L684)
{% endhint %}

## User State Transition Verifier

Verify a [user state transition proof](../../circuits/user-state-transition-proof.md#3.-user-state-transition-proof) with UniRep smart contract.

```solidity
function verifyUserStateTransition(
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) external view returns (bool)
```

{% hint style="info" %}
source: [Unirep.sol/verifyUserStateTransition](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L716)
{% endhint %}
