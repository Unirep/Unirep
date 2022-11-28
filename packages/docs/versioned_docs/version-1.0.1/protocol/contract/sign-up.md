---
description: How the UniRep smart contract can help user and attester sign up.
---

# Sign up

## User Signs Up

User signs up by providing an identity commitment. It also inserts a state leaf into the state tree.

```solidity
function userSignUp(uint256 identityCommitment) external
```

{% hint style="info" %}
source: [Unirep.sol/userSignUp](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L133)
{% endhint %}

If user signs up through an attester (`msg.sender` is a registered attester) and the attester sets the airdrop amount `airdropAmount` non-zero, the user will have a one non-zero leaf in his user state. The non-zero leaf is computed by

```typescript
const hasSignedUp = 1
const airdroppedLeaf = hash(airdropPosRep, 0, 0, hasSignedUp)
```

{% hint style="info" %}
See: [core/src/computeInitUserStateRoot](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/core/src/utils.ts#L71)
{% endhint %}

## Attester Signs up

Attester can sign up through `attesterSignUp` and `attesterSignUpViaRelayer`.

```solidity
function attesterSignUp() external override
```

{% hint style="info" %}
source: [Unirep.sol/attesterSignUp](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L169)
{% endhint %}

If an attester signs up through his wallet or another smart contract, UniRep smart contract will record the `msg.sender` and assign an attester ID to the address.

```solidity
function attesterSignUpViaRelayer(
    address attester,
    bytes calldata signature
) external override
```

{% hint style="info" %}
source: [Unirep.sol/attesterSignUpViaRelayer](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L178)
{% endhint %}

The attester can also sign up through another relayer, but he has to provide the address of the attester who wants to sign up and the signature. The attester signs over his's own address concatenated with this contract address, then the UniRep smart contract will verify the signature by [verifySignature](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/libraries/VerifySignature.sol#L8).
