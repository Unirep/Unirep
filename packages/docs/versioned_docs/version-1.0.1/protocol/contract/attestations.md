---
description: >-
  How airdrop, attestation, spending reputation happens in UniRep smart
  contract.
---

# Attestations

## Set airdrop amount

After signing up, attesters can set the airdrop amount that whoever signs up through the attester, the user can get airdropped positive reputation.

```solidity
function setAirdropAmount(uint256 amount) external
```

{% hint style="info" %}
source: [Unirep.sol/setAirdropAmount](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L191)
{% endhint %}

## Airdrop Epoch key

An attester can submit the airdrop attestation to an epoch key with a [sign up proof](../../circuits/user-sign-up-proof.md). The `msg.sender` should match the `attesterId` in the `publicSignals`.

```solidity
/**
* @dev An attester submit the airdrop attestation to an epoch key with a sign up proof
* publicSignals[0] = [ epoch ]
* publicSignals[1] = [ epochKey ]
* publicSignals[2] = [ globalStateTree ]
* publicSignals[3] = [ attesterId ]
* publicSignals[4] = [ userHasSignedUp ]
* @param publicSignals The public signals of the sign up proof
* @param proof The The proof of the sign up proof
 */
function airdropEpochKey(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external payable
```

{% hint style="info" %}
source: [Unirep.sol/airdropEpochKey](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L340)
{% endhint %}

## Submit Epoch Key Proof

The epoch key proof should be submitted before to get attestation. Then others can verify if the attestation is given to a valid epoch key.

```solidity
/**
* @dev A user should submit an epoch key proof and get a proof index
* publicSignals[0] = [ globalStateTree ]
* publicSignals[1] = [ epoch ]
* publicSignals[2] = [ epochKey ]
* @param publicSignals The public signals of the epoch key proof
* @param proof The The proof of the epoch key proof
*/
function submitEpochKeyProof(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external
```

{% hint style="info" %}
source: [Unirep.sol/submitEpochKeyProof](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L306)
{% endhint %}

## Submit Attestation

An attester can submit the attestation with a **proof index**. A valid proof is either an [epoch key proof](../../circuits/epoch-key-proof.md), a [user sign up proof](../../circuits/user-sign-up-proof.md) or a [reputation proof](../../circuits/reputation-proof.md) with epoch key being one of the public signals. An attester can also submit attestations through a relayer or not.

It it is from a [reputation proof](../../circuits/reputation-proof.md) we should include a **`fromProofIndex`** to make sure the attestation is from a valid reputation proof, or the attestation will fail.

```solidity
function submitAttestation(
    Attestation calldata attestation,
    uint256 epochKey,
    uint256 toProofIndex,
    uint256 fromProofIndex
) external payable
```

{% hint style="info" %}
source: [Unirep.sol/submitAttestation](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L253)
{% endhint %}

```solidity
function submitAttestationViaRelayer(
    address attester,
    bytes calldata signature,
    Attestation calldata attestation,
    uint256 epochKey,
    uint256 toProofIndex,
    uint256 fromProofIndex
) external payable
```

{% hint style="info" %}
source: [Unirep.sol/submitAttestationViaRelayer](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L279)
{% endhint %}

## Spend Reputation

A user include a [reputation proof](../../circuits/reputation-proof.md) to spend reputation via an attester, the non-zero nullifiers will be processed as a negative attestation, and the spent reputation cannot be re-used.&#x20;

```solidity
/**
* @dev A user spend reputation via an attester, the non-zero nullifiers will be processed as a negative attestation
* publicSignals[0: maxReputationBudget ] = [ reputationNullifiers ]
* publicSignals[maxReputationBudget    ] = [ epoch ]
* publicSignals[maxReputationBudget + 1] = [ epochKey ]
* publicSignals[maxReputationBudget + 2] = [ globalStateTree ]
* publicSignals[maxReputationBudget + 3] = [ attesterId ]
* publicSignals[maxReputationBudget + 4] = [ proveReputationAmount ]
* publicSignals[maxReputationBudget + 5] = [ minRep ]
* publicSignals[maxReputationBudget + 6] = [ proveGraffiti ]
* publicSignals[maxReputationBudget + 7] = [ graffitiPreImage ]
* @param publicSignals The public signals of the reputation proof
 * @param proof The The proof of the reputation proof
 */
function spendReputation(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external payable
```

{% hint style="info" %}
source: [Unirep.sol/spendReputation](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L401)
{% endhint %}

After the `spendReputation` event emitted, the reputation will assign a `proofIndex`. Then the `proofIndex` can be included in the `fromProofIndex` of [submitAttestation](attestations.md#submit-attestation).

The proof index can be queried by proof hash. And the proof hash can be computed by

{% tabs %}
{% tab title="ethers" %}
Generate proof hash from `ethers`

```typescript
import ethers from 'ethers'

const proofHash = ethers.utils.solidityKeccak256(
    ['uint256[]', 'uint256[8]'],
    [publicSignals, proof]
)
```
{% endtab %}

{% tab title="@unirep/contracts" %}
Generate proof hash from `@unirep/contracts`

```typescript
import { ReputationProof } from '@unirep/contracts'

const proof = new ReputationProof(
    publicSignals,
    proof
)
const proofHash = proof.hash(()
```
{% endtab %}
{% endtabs %}

Then call the UniRep smart contract to query the proof index

```typescript
const unirepContract = new ethers.Contract(address, abi, provider)
const index = await unirepContract.getProofIndex(
    proofHash
)
```
