---
description: >-
  How airdrop, attestation, spending reputation happens in UniRep smart
  contract.
---

# Attestations

## Submit Attestation

An attester can submit the attestation with a **proof index**. A valid proof is either an [epoch key proof](../circuits/epoch-key-proof.md), a [user sign up proof](../circuits/user-sign-up-proof.md) or a [reputation proof](../circuits/reputation-proof.md) with epoch key being one of the public signals. An attester can also submit attestations through a relayer or not.

It it is from a [reputation proof](../circuits/reputation-proof.md) we should include a **`fromProofIndex`** to make sure the attestation is from a valid reputation proof, or the attestation will fail.

```solidity title=contracts/Unirep.sol
function submitAttestation(
    Attestation calldata attestation,
    uint256 epochKey
) external payable {
```

:::info
source: [Unirep.sol/submitAttestation](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L335)
:::

```solidity title=contracts/Unirep.sol
function submitAttestationViaRelayer(
    address attester,
    bytes calldata signature,
    Attestation calldata attestation,
    uint256 epochKey
) external payable {
```

:::info
source: [Unirep.sol/submitAttestationViaRelayer](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L362)
:::

## Spend Reputation

A user include a [reputation proof](../circuits/reputation-proof.md) to spend reputation via an attester, the non-zero nullifiers will be processed as a negative attestation, and the spent reputation cannot be re-used.&#x20;

```solidity title=contracts/Unirep.sol
/**
* @dev A user spend reputation via an attester, the non-zero nullifiers will be processed as a negative attestation
* publicSignals[0] = [ epochKey ]
* publicSignals[1] = [ globalStateTree ]
* publicSignals[2: maxReputationBudget + 2] = [ reputationNullifiers ]
* publicSignals[maxReputationBudget + 2] = [ epoch ]
* publicSignals[maxReputationBudget + 3] = [ attesterId ]
* publicSignals[maxReputationBudget + 4] = [ proveReputationAmount ]
* publicSignals[maxReputationBudget + 5] = [ minRep ]
* publicSignals[maxReputationBudget + 6] = [ minRep ]
* publicSignals[maxReputationBudget + 7] = [ proveGraffiti ]
* publicSignals[maxReputationBudget + 8] = [ graffitiPreImage ]
* @param publicSignals The public signals of the reputation proof
 * @param proof The The proof of the reputation proof
 */
function spendReputation(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external payable {
```

:::info
source: [Unirep.sol/spendReputation](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L427)
:::