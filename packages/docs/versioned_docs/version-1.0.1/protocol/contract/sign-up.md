---
description: How the UniRep smart contract can help user and attester sign up.
---

# Sign up

## User Signs Up

User signs up by providing an identity commitment and an initial balance. It also inserts a state leaf into the state tree.

```solidity title=contracts/Unirep.sol
function userSignUp(uint256 identityCommitment, uint256 initBalance) public
```

:::info
source: [Unirep.sol/userSignUp](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L170)
:::

If user signs up through an attester (`msg.sender` is a registered attester) and the attester sets the airdrop amount `initBalance` non-zero, the user will have a one non-zero leaf in his user state. The non-zero leaf is computed by

```typescript
const hasSignedUp = 1
const airdroppedLeaf = hash(initBalance, 0, 0, hasSignedUp)
```

:::info
See: [core/src/computeInitUserStateRoot](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/src/utils.ts#L68)
:::

## Attester Signs up

Attester can sign up through `attesterSignUp` and `attesterSignUpViaRelayer`.

```solidity title=contracts/Unirep.sol
function attesterSignUp() external override
```

:::info
source: [Unirep.sol/attesterSignUp](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L246)
:::

If an attester signs up through his wallet or another smart contract, UniRep smart contract will record the `msg.sender` and assign an attester ID to the address.

```solidity title=contracts/Unirep.sol
function attesterSignUpViaRelayer(
    address attester,
    bytes calldata signature
) external override
```

:::info
source: [Unirep.sol/attesterSignUpViaRelayer](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L255)
:::

The attester can also sign up through another relayer, but he has to provide the address of the attester who wants to sign up and the signature. The attester signs over his's own address concatenated with this contract address, then the UniRep smart contract will verify the signature by [verifySignature](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/libraries/VerifySignature.sol#L8).
