---
title: Error codes
---

This section contains a list of all possible errors that might occur while using 
```sol
import { Unirep } from '@unirep/contracts/Unirep.sol';
```

:::info
When developing with hardhat environment, these custom errors can be seen in the `_selector`:
```js
Error: cannot estimate gas; transaction may fail or may require manual gas limit 
...,
{"type":18,"address":{"type":"Buffer","data":[183,248,188,99,187,202,209,129,85,32,19,8,200,243,84,11,7,248,79,94]},"message":{"value":{"type":"Buffer","data":[103,103,221,161,0,0,0,0,0,0,0,0,0,0,0,0,165,28,31,194,240,209,161,184,73,78,209,254,49,45,124,58,120,237,145,192]},"_selector":"6767dda1"},"isInvalidOpcodeError":false}],"data":"0x6767dda1000000000000000000000000a51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0"}, code=UNPREDICTABLE_GAS_LIMIT, version=providers/5.7.2)
```
:::

## 0x099cfcff
- `UserAlreadySignedUp(uint256 identityCommitment)` <br/>
The given identity commitment has already signed up in the current Unirep contract. <br/>
A user cannot double sign-up in an application.

## 0x6767dda1
- `AttesterAlreadySignUp(uint160 attester)` <br/>
The attester has already signed up in the current Unirep contract. <br/>
An attester cannot double sign-up in the Unirep protocol.

## 0xd724105a
- `AttesterNotSignUp(uint160 attester)`<br/>
The attester has not signed up in the current Unirep contract. <br/> 
Please call [`attesterSignUp()`](unirep-sol#attestersignup)

## 0xd7aa5847
- `AttesterInvalid()`<br/>
The givein attester address is not a valid `uint160` type data. <br/>
Please check if the attester address is correctly assigned while generating proofs.

## 0x4ae5505e
- `ProofAlreadyUsed(bytes32 nullilier)`<br/>
The proof is already used in Unirep contract. <br/> 
A proof cannot be submitted twice in the Unirep protocol. This is used to prevent replay attack.

## 0xdc215c0a
- `NullifierAlreadyUsed(uint256 nullilier)`<br/>
The [nullifier](../protocol/nullifiers) is already used in Unirep contract. <br/>
A nullifier cannot be submitted twice in the Unirep protocol.

## 0xedc650d7
- `AttesterIdNotMatch(uint160 attesterId)`<br/>
The `msg.sender` does not match the claimed attester ID. <br/> 
Please send the transaction through the attester.

## 0x8baa579f
- `InvalidSignature()`<br/>
The signature does not match the attester ID. <br/>
Please make sure the signature is signed through the correct attester.

## 0x2217bbbc
- `InvalidEpochKey()`<br/>
    The max [epoch key](../protocol/epoch-key.md) is computed by
    ```sol
    uint256 maxEpochKey = uint256(config.epochTreeArity) ** config.epochTreeDepth - 1;
    ```
    The epoch key which is greater than this range is recognized invalid. <br/> Please check if the contract configs `maxEpochKey()`, `epochTreeArity()` and `epochTreeDepth()` match the circuit configs.

## 0x53d3ff53
- `EpochNotMatch()` <br/>
    Current [epoch](../protocol/epoch.md) does not match the epoch in the proof or the target epoch. <br/>
    Please check the current epoch and generate a corresponding proof.

## 0xa225656d
- `InvalidEpoch(uint256 epoch)`<br/>
    The [epoch](../protocol/epoch.md) in the proof is greater than the current epoch. <br/>
    Please check the current epoch and generate a corresponding proof.

## 0x09bde339
- `InvalidProof()`<br/>
    The proof is verified invalid through on-chain verifiers. <br/>
    Please verify it with the off-chain [prover](../circuits-api/prover.md). <br/> 
    If it is valid off-chain but invalid through on-chain verifiers, please check the if the proving keys match the ones on-chain.

## 0xf1b8a45e
- `InvalidStateTreeRoot(uint256 stateTreeRoot)`<br/>
    The [state tree](../protocol/trees.md#state-tree) root of given epoch does not exist in the current Unirep contract. <br/>
    There are several reasons:
    1. The user does not sign up successfully
    2. The user does not perform user state transition successfully
    3. `userSignUp` transaction or `userStateTransition` transaction is pending
    4. Epoch and state tree root does not match

## 0xfa2e644d
- `InvalidEpochTreeRoot(uint256 epochTreeRoot)`<br/>
    The [epoch tree](../protocol/trees.md#epoch-tree) root of given epoch does not match the current Unirep contract. <br/>
    Please check if all attestations are processed correctly and successfully.

## 0x17643148
- `HashchainInvalid()`<br/>
    The [hashchain](../protocol/attestation.md#hashchain) which is going to be processed does not match the on-chain hashchain. <br/>
    Please check if the previous hashchain has been processed.


## 0xac46def6
- `HashchainNotProcessed()`<br/>
    [Hashchains](../protocol/attestation.md#hashchain) are not processed completely before a [user state transition](../protocol/user-state-transition.md). <br/>
    Please wait until all hashchains are processed by the attester.
