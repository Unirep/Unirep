# User state transition

There are three steps in user state transition (see [user state transition proof](../../circuits/user-state-transition-proof.md)), and they should be performed in order.

## Start user state transition

```solidity
/**
* @dev User submit a start user state transition proof
* publicSignals[0] = [ blindedUserState ]
* publicSignals[1] = [ blindedHashChain ]
* publicSignals[2] = [ globalStateTree ]
* @param publicSignals The public signals of the start user state transition proof
* @param proof The The proof of the start user state transition proof
*/
function startUserStateTransition(
    uint256[] memory publicSignals,
    uint256[8] memory proof
) external 
```

{% hint style="info" %}
source: [Unirep.sol/startUserStateTransition](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L523)
{% endhint %}

After start user state transition proof event is emitted, the proof will be assign a proof index, which will be attached to [updateUserStateRoot](user-state-transition.md#user-state-transition) function.

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
import { StartTransitionProof } from '@unirep/contracts'

const proof = new StartTransitionProof(
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

## Process attestations

```solidity
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

{% hint style="info" %}
source: [Unirep.sol/processAttestations](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L553)
{% endhint %}

After process attestations proof event is emitted, the proof will be assign a proof index, which will be attached to [updateUserStateRoot](user-state-transition.md#user-state-transition) function.

The proof index can be queried by proof hash. And the proof hash can be computed by

{% tabs %}
{% tab title="ethers" %}
Generate proof hash from `ethers`

```typescript
import ethers from 'ethers'

const proofHash = ethers.utils.solidityKeccak256(
    ['uint256[]', 'uint256[8]'],
    [publicSignals, proof]
)Generate proof hash from @unirep/contracts
```
{% endtab %}

{% tab title="@unirep/contracts" %}
Generate proof hash from `@unirep/contracts`

```typescript
import { ProcessAttestationsProof } from '@unirep/contracts'

const proof = new ProcessAttestationsProof(
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

## User State Transition

```solidity
/**
* @dev User submit the latest user state transition proof
* publicSignals[0] = [ newGlobalStateTreeLeaf ] 
* publicSignals[1:  numEpochKeyNoncePerEpoch] = [ epkNullifiers ] 
* publicSignals[1+  numEpochKeyNoncePerEpoch] = [ transitionFromEpoch ] 
* publicSignals[2+  numEpochKeyNoncePerEpoch: 
                3+  numEpochKeyNoncePerEpoch] = [ blindedUserStates ] 
* publicSignals[4+  numEpochKeyNoncePerEpoch] = [ fromGlobalStateTree ] 
* publicSignals[5+  numEpochKeyNoncePerEpoch:
                4+2*numEpochKeyNoncePerEpoch] = [ blindedHashChains ] 
* publicSignals[5+2*numEpochKeyNoncePerEpoch] = [ fromEpochTree ] 
* @param publicSignals The the public signals of the user state transition proof
* @param proof The proof of the user state transition proof
* @param proofIndexRecords The proof indexes of the previous start transition proof and process attestations proofs
*/
function updateUserStateRoot(
    uint256[] memory publicSignals,
    uint256[8] memory proof,
    uint256[] memory proofIndexRecords
) external 
```

{% hint style="info" %}
source: [Unirep.sol/updateUserStateRoot](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L588)
{% endhint %}

The `proofIndexRecords` is the proof indexes of all `startTransitionProof` and `processAttestationsProof` that are submitted sequentially. See [Start user state transition](user-state-transition.md#start-user-state-transition) and [Process attestations](user-state-transition.md#undefined).
