# Unirep
UniRep is a private and nonrepudiable repuation system. Users can receive positive and negative reputation from attesters, and voluntarily prove that they have at least certain amount of reputation without revealing the exact amount. Moreover, users cannot refuse to receive reputation from an attester.

## Install and build

```
npm install
```

then run

```
npm run build
``` 
to build the circuits

## Test

```
npm run test
```

## Introduction

### Cryptography tools used
- poseidon hash function
    - `hashLeftRight()`(represented as `hash` hereafter) and `hash5()`
- [semaphore identity](https://github.com/weijiekoh/libsemaphore)
    - `identityCommitment`
        - ``identityCommitment`` is the hash of user's EdDSA pubkey, `identityNullifier` and `identityTrapdoor`

### Actors in Unirep
- There are users who receive reputation and prove received reputation
    - user signs up by calling `userSignUp` in Unirep contract
        - user's `identityCommitment` is revealed at this time and it will be recorded in the contract to prevent double signup
            - the identity commitment will not reveal the actual identity of the user but at the same time allow user to prove identity in the cirucit 
- There are attesters who give attestations to users and the attestations become the users' reputation
    - attester signs up by calling `attesterSignUp` in Unirep contract
        - attesters would be given `attesterId` by the order they sign up, `attesterId` begins with `1`
        - attester record and attestation record are public and so everyone can see which attester submits which attestation to the Unirep contract

### Won't this reveal who is receiving what attestation from which attester?
- so the receiver of an attestation is not a user's `identityCommitment` but an random value called `epochKey`, i.e., attester attests to an `epochKey` instead of an `identityCommitment`
    - `epochKey` is computed by `hash5(identityNullifier, epoch, nonce, 0, 0)`
        - only the user knows his `identityNullifier` so only he knows if he is receiving an attestation, others would see an attestation attesting to a random value
        - and in the circuit user can prove that he knows the `epochKey` and can rightfully receive and process the attestations attested to this `epochKey`

### Can a user choose not to process certain attestations that are bad for his reputation?
- No. The attestations to an `epochKey` would be chained together. A hashchain would be formed by the hashes of the attestations.
    - So user can not omit any attestation because the circuit requires each attestation in the hashchain to be processed.
        - if user omits an attestation, then the computed hashchain would not match the one in the Unirep contract
```
hashChainResult = hash(attestation_3, hash(attestation_2, hash(attestation_1, 0)))
```

### Data structures in Unirep

#### User state tree
- a user state tree is a sparse merkle tree with it's leaves storing reputation received from each attester, e.g.,
    - a user state tree leaf = hash of the reputation
```
                                    user state tree root
                                    /                  \
        hash(DEFAULT_REP_HASH, 0xabc...)              hash(0xbcd..., 0xcde...)
               /        \                                      /         \
[No rep for leaf 0] [leaf 1: 0xabc...]              [leaf 2: 0xbcd...] [leaf 3: 0xcde...]
```
- NOTE: `[leaf 1: 0xabc...]` represents the reputation received from attester with `attesterId = 1` and `0xabc...` is the hash of the reputation


#### Global state tree
- a global state tree is an incremental sparse merkle tree with it's leaves storing users' `identityCommitment`s and `userStateRoot`s, e.g.,
    - a global state tree leaf = `hash(identityCommitment, userStateRoot)`

```
                            global state tree root
                            /                \
        hash(0xabc..., 0xcde...)         hash(0xdef..., DEFAULT_EMPTY_HASH)
               /        \                          /         \
[leaf_0: 0xabc...] [leaf_1: 0xcde...] [leaf_2: 0xdef...] [DEFAULT_EMPTY_HASH]
```
- NOTE: this is an incremental merkle tree so leaves are inserted from left (leaf index 0) to right, one by one, instead of inserted directly into the specified leaf index.
- NOTE: since global state tree leaf is the hash of `identityCommitment` and `userStateRoot`, others will be not be able to tell which user (his `identityCommitment`) inserted his user state into global state tree.

#### Epoch tree
- an epoch tree is a sparse merkle tree with it's leaves storing hashchain results of each epoch key, e.g.,
```
                                epoch tree root
                               /               \
      hash(DEFAULT_EMPTY_HASH, 0x123...)   hash(DEFAULT_EMPTY_HASH, 0x456...)
            /             \                      /                  \
[DEFAULT_EMPTY_HASH]  [epk_1: 0x123...]    [DEFAULT_EMPTY_HASH]  [epk_3: 0x456...]
```

#### Nullifier tree
- an nullifier tree is a sparse merkle tree with it's leaves storing nullifier of already processed attestations or epoch keys, e.g.,
```
                nullifier tree root
              /                     \
      hash(1, 0)                     hash(0, 1)
     /          \                    /         \
[leaf 0: 1]  [leaf 1: 0]       [leaf_2: 0] [leaf_3: 1]
```
- NOTE: leaf 0 of nullifier tree is reserved, it always has value `1`
- NOTE: leaf value `1` means the nullifier represented by the leaf index is processed. In the example above, nullifier `3` is stored in nullifier tree, this nullifier could be a nullifier of an attestation or an epoch key, and it means that the attestation or the epoch key is processed.
- NOTE: nullifiers are used to prevent user from processing an aleady processed attestation or epoch key.

- an attestation includes the following data:
```solidity
struct Attestation {
    // The attester’s ID
    uint256 attesterId;
    // Positive reputation
    uint256 posRep;
    // Negative reputation
    uint256 negRep;
    // A hash of an arbitary string
    uint256 graffiti;
    // Whether or not to overwrite the graffiti in the user’s state
    bool overwriteGraffiti;
}
```
- nullifier of an attestation is computed by `hash5(ATTESTATION_NULLIFIER_DOMAIN, identityNullifier, attesterId, epoch, epochKey)`
    - `ATTESTATION_NULLIFIER_DOMAIN` is used to prevent mixed-up of attestation nullifier and epoch key nullifier
- nullifier of an epoch key is computed by `hash5(EPOCH_KEY_NULLIFIER_DOMAIN, identityNullifier, epoch, nonce, 0)`
    - `EPOCH_KEY_NULLIFIER_DOMAIN` is used to prevent mixed-up of attestation nullifier and epoch key nullifier
- a reputation includes the following data: `posRep, negRep, graffiti`
    - it does not include `attesterId` like an attestation does because reputation is already stored in user state tree with `attesterId` as leaf index

### Epoch, epoch transition and user state transition
- There is the notion of epoch in Unirep. Every `epochLength` seconds, one epoch ends and next epoch begins.
    - Epoch transition happens when someone calls `beginEpochTransition`
        - in `beginEpochTransition`, all epoch keys attested during this epoch will have their hash chain sealed
            - by 'sealed' it means that the hash chain is hashed again with `1`, e.g., `hash(1, originalHashChain)`
            - if an epoch key received no attestation, it's hash chain would be `hash(1, 0)`
        - After hash chain of the epoch keys are sealed, these epoch keys and their hash chain will be inserted into the epoch tree of this epoch
            - there's one epoch tree for every epoch
        - caller will be compensated for executing the epoch transition
    - There will be a new global state tree for each epoch
        - and user needs to perform user state transition to transition his user state into the latest epoch
            - user performs user state transition by calling `updateUserStateRoot`
            - once the user performed user state transition, his user state will be inserted into the global state tree of the latest epoch
            - so if a user does not perform user state transition during an epoch, his user state will not be in the global state tree of that epoch
- User should perform user state transition before he can prove the latest attestations he received.
    - Also, user should perform user state transition before he can receive any attestations further. Attester can still attest to a user's epoch key in the past epoch but the user will not be able to process the attestation.

### Example flow using CLI commands

#### 1. First, spin up the testing chain
```
npx hardhat node
```
- NOTE: a list of default accounts will be printed, choose one of them to be user's account and one to be attester's. User's and attester's private key will be referred to as `userPrivateKey` and `attesterPrivateKey` respectively.

#### 2. Deploy Unirep contract
```
npx ts-node cli/index.ts deploy -d userPrivateKey
```
-NOTE: Unirep contract's address will be printed. For example, `Unirep: 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B`

#### 3. Generate user's identity and identity commitment
```
npx ts-node cli/index.ts genUnirepIdentity
```
- NOTE: base64url encoded identity and identity commitment will be printed, For example,
```
Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd
278
Unirep.identityCommitment.MTI0ZWQ1YTc4NjYzMWVhODViY2YzZDI4NWFhOTA5MzFjMjUwOTEzMzljYzAzODU3YTVlMzY5ZWYxZmI2NTAzNw
```

#### 4. User signs up
```
npx ts-node cli/index.ts userSignup -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B... -c Unirep.identityCommitment.MTI0ZWQ1YTc4NjYzMWVhODViY2YzZDI4NWFhOTA5MzFjMjUwOTEzMzljYzAzODU3YTVlMzY5ZWYxZmI2NTAzNw -d userPrivateKey
```
- NOTE: `-x` is the Unirep contract address and `-c` is user's identity commitment

#### 5. Attester signs up
```
npx ts-node cli/index.ts attesterSignup -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d attesterPrivateKey
```
- NOTE: `-d` is attester's private key, this private key is to be used only by this attester hereafter

#### 6. User generates epoch key and epoch key proof
```
npx ts-node cli/index.ts genEpochKeyAndProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd -n 0
```
- NOTE: `-id` is user's identity and `-n`  is epoch key nonce which should be less than the system parameter `maxEpochKeyNonce`
- NOTE: epoch key and base64url encoded epoch key proof will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: 3d
Unirep.epkProof.WyIxNDg5MTgwNTg3ODMyODk3ODU0NTYzNTI4MTAxNDAwODY4MTIxMTAyODg1NjY3MTAwOTM0Mzc2MTgwODkxMzQ3Mzg2MzEzNDEwMjA1MyIsIjYxMzI2NTYxOTQ4NDk1MjMwMDUyNDI4OTI3Mjg0OTMwODQ3NDY1NTA3OTE3MTk1MTYwNTM5NjY2MTAzMzA4Mjg5NDc5NjEwNDI5NDYiLCIxMDc4NTcxMDIxMTYyMTI2MTE4NzkwOTQ4MjEzMjk5ODA0MzgzMjQyOTczMzM4MTQ3NDU3NTA5NTY5MjgzMzQzNTY5ODE0MTE5ODQ2MSIsIjY5OTgzMTU3NzA2NjQyMDAwNTc4ODA5OTcxODkyNzQzOTY0Njc3Mzc4NTQ0NTc0NjQ5NDc0MDY1NjkwNDEzNjQ0MzM1NjkwNTU4MDciLCI5Mzk4NDE1NTE0MjExMDQ5NTkzNjc1ODIzMzMyOTQzMDQ1ODk5NTUzMTkzODUwMTYxODk0NzU5NjQ2Mzc2MjgzMTUwOTQ2MTcxMzEwIiwiNjM4MDYyNzY2NTY4MDc5MzA2ODg3NDU0MzMxMzcwODg4NzUzNDY3Njk2MjQyOTY2OTQ5ODIxMzAxNzU1OTI5NDYwODgxODk0Mjk4MiIsIjk5ODgzOTA5MjM5MDQ5MTU1NzM5Mjk1NTQ0NTY3MDM2NTk1NDE5MDk2Mjk2OTk3MDM5ODkzNjU3NTU1NzIyNzUxMjQzNTI3MjY4MzAiLCIxODg5ODI1MDA0NTAzNzE2NjcxNzQ4MjkwNDI2MzA2MDkzMzA2NDk0NzczOTg5MDc5MjU5MDQwODYyNzI0MjE2MjY1MTM3NDUwMjY1Il0
```

#### 7. Attester verify epoch key proof
```
npx ts-node cli/index.ts verifyEpochKeyProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -epk 33 -pf Unirep.epkProof.WyIxNDg5MTgwNTg3ODMyODk3ODU0NTYzNTI4MTAxNDAwODY4MTIxMTAyODg1NjY3MTAwOTM0Mzc2MTgwODkxMzQ3Mzg2MzEzNDEwMjA1MyIsIjYxMzI2NTYxOTQ4NDk1MjMwMDUyNDI4OTI3Mjg0OTMwODQ3NDY1NTA3OTE3MTk1MTYwNTM5NjY2MTAzMzA4Mjg5NDc5NjEwNDI5NDYiLCIxMDc4NTcxMDIxMTYyMTI2MTE4NzkwOTQ4MjEzMjk5ODA0MzgzMjQyOTczMzM4MTQ3NDU3NTA5NTY5MjgzMzQzNTY5ODE0MTE5ODQ2MSIsIjY5OTgzMTU3NzA2NjQyMDAwNTc4ODA5OTcxODkyNzQzOTY0Njc3Mzc4NTQ0NTc0NjQ5NDc0MDY1NjkwNDEzNjQ0MzM1NjkwNTU4MDciLCI5Mzk4NDE1NTE0MjExMDQ5NTkzNjc1ODIzMzMyOTQzMDQ1ODk5NTUzMTkzODUwMTYxODk0NzU5NjQ2Mzc2MjgzMTUwOTQ2MTcxMzEwIiwiNjM4MDYyNzY2NTY4MDc5MzA2ODg3NDU0MzMxMzcwODg4NzUzNDY3Njk2MjQyOTY2OTQ5ODIxMzAxNzU1OTI5NDYwODgxODk0Mjk4MiIsIjk5ODgzOTA5MjM5MDQ5MTU1NzM5Mjk1NTQ0NTY3MDM2NTk1NDE5MDk2Mjk2OTk3MDM5ODkzNjU3NTU1NzIyNzUxMjQzNTI3MjY4MzAiLCIxODg5ODI1MDA0NTAzNzE2NjcxNzQ4MjkwNDI2MzA2MDkzMzA2NDk0NzczOTg5MDc5MjU5MDQwODYyNzI0MjE2MjY1MTM3NDUwMjY1Il0
```
- NOTE: `-epk` is user's epoch key and `-pf` is the epoch key proof

#### 8. Attester attest to epoch key
```
npx ts-node cli/index.ts attest -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d attesterPrivateKey -epk 33 -pr 10 -nr 8 -gf 176ff05d9c7c4528b04553217098a71cd076d52623dab894a7f7ee34116ca170
```
- NOTE: `-pr` is the positive reputation given to the user, `-nr` is the negative reputation given to the user and `-gf` is the graffiti for the reputation given to the user

#### 9. Epoch transition
```
npx ts-node cli/index.ts epochTransition -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d 0x... -t
```

NOTE: `-d` private key could be anyone's private key and `-t` indicates it's testing environment so it will fast forward to the end of epoch

#### 10. User state transition
```
npx ts-node cli/index.ts userStateTransition -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d userPrivateKey -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd
```

#### 11. User generate reputation proof
```
npx ts-node cli/index.ts genReputationProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd -a 1 -mp 0 -mn 10 -gp 0
```
- NOTE: `-a` is attester's id, `-mp` is the minimum positive reputation score, i.e, user wants to prove that the attester gave the user a positive reputation score that's larger than the minimum positive reputation score, `-mn` is the maximum negative reputation score, i.e, user wants to prove that the attester gave the user a negative reputation score that's less than the maximum negative reputation score and `-gp` is the pre-image of the graffiti for the reputation
- NOTE: `gp` in this case, `0` being the hash pre-image of `176ff05d9c7c4528b04553217098a71cd076d52623dab894a7f7ee34116ca170`
- NOTE: proof will be printed and it should be handed to the receiver of this proof, for example,
```
Proof of reputation from attester 1:
Unirep.reputationProof.WyIxMzMzNjY5MTkyMjk1NTE4MjgyNTM2NjMyNzc0MjUxMzM0NDExNjgzOTE1Njc5ODI5MDQ1NzUxNzIxNzA1OTkxNTk1MzUzMzkzMDc5NyIsIjk0NjM0MjUwNTY2NzgyNzMxMzUxMzY3NjI4OTQ3OTU3MTg1OTc0MTgzMzIwMjM2NDE0NzExODEyOTYyNjk0ODc4MjM2OTM2MzgyNzEiLCIxODQ1NTUzMDg2NTUwMDUxMzkyNDM0NjYxNjIzNjkzMTQwMzgyMjYyNDA1MDgwMzU1NjM2NDY4MDc4MjU0MjM5NTcxNTQ4MDQ5Njg0NyIsIjEzNzg5OTg3NDk0OTA3NDQzNTg3NjczODA5OTk5NTUyMzQzNDg0ODM5Mzk0NzMyNDI1ODg4NTkyMDEwNDU5MzM5ODA1Nzc4OTc2Mjk2IiwiMTg4MzU3NzI0MzgxNTg1Mjk3NTM4MzczMjgwNTQwODkzNDI0MjcwMTg0MjA0NDAxOTc5MDAzMDI5ODk0MzkwMzg3NTY1NDU4MjE3MTciLCIxMjI1MDYwMzkwOTkyMjQ4NzAxNzg1NzAxODk4OTk1OTEzMzgxOTE4ODI2NjU2NTY0MDkyMzIxNDY5NzE2OTc1MjA2NzA4NDQ2NTAwMCIsIjI4NzQ3Nzc2MTg2NjE3NzczNDMzMTU3MzIyOTAyODY4MjMyOTMyNDI0NTQwMjQ1NTQ1OTIyMTIwNTY2NTYwODg4NDY5MTEzNDkxNjUiLCI5MDc1NTcwMTYyNDkyNjQ5NzEwMzg5Njc5NTY1Mzk1NjUwOTQ1OTU0MjQzMDAxOTY0Njg3NjM3MDM3OTMxNzc3MDg2NDgyOTA5MDQ1Il0
```

#### 12. (someone) Verify the reputation proof
```
npx ts-node cli/index.ts verifyReputationProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -a 1 -mp 0 -mn 10 -gp 0 -pf Unirep.reputationProof.WyIxMzMzNjY5MTkyMjk1NTE4MjgyNTM2NjMyNzc0MjUxMzM0NDExNjgzOTE1Njc5ODI5MDQ1NzUxNzIxNzA1OTkxNTk1MzUzMzkzMDc5NyIsIjk0NjM0MjUwNTY2NzgyNzMxMzUxMzY3NjI4OTQ3OTU3MTg1OTc0MTgzMzIwMjM2NDE0NzExODEyOTYyNjk0ODc4MjM2OTM2MzgyNzEiLCIxODQ1NTUzMDg2NTUwMDUxMzkyNDM0NjYxNjIzNjkzMTQwMzgyMjYyNDA1MDgwMzU1NjM2NDY4MDc4MjU0MjM5NTcxNTQ4MDQ5Njg0NyIsIjEzNzg5OTg3NDk0OTA3NDQzNTg3NjczODA5OTk5NTUyMzQzNDg0ODM5Mzk0NzMyNDI1ODg4NTkyMDEwNDU5MzM5ODA1Nzc4OTc2Mjk2IiwiMTg4MzU3NzI0MzgxNTg1Mjk3NTM4MzczMjgwNTQwODkzNDI0MjcwMTg0MjA0NDAxOTc5MDAzMDI5ODk0MzkwMzg3NTY1NDU4MjE3MTciLCIxMjI1MDYwMzkwOTkyMjQ4NzAxNzg1NzAxODk4OTk1OTEzMzgxOTE4ODI2NjU2NTY0MDkyMzIxNDY5NzE2OTc1MjA2NzA4NDQ2NTAwMCIsIjI4NzQ3Nzc2MTg2NjE3NzczNDMzMTU3MzIyOTAyODY4MjMyOTMyNDI0NTQwMjQ1NTQ1OTIyMTIwNTY2NTYwODg4NDY5MTEzNDkxNjUiLCI5MDc1NTcwMTYyNDkyNjQ5NzEwMzg5Njc5NTY1Mzk1NjUwOTQ1OTU0MjQzMDAxOTY0Njg3NjM3MDM3OTMxNzc3MDg2NDgyOTA5MDQ1Il0
```

### Computation happens off-chain

After you read through the introduction above, you should have a picture of how Unirep works. User/attester registers on-chain, attester submits attestations on-chain, user submits proof to update his state and also the global state tree of current epoch in Unirep contract. These all happens on-chain, including proof verification, updating global state trees and generating epoch trees, but these computation could be very expensive!

There are no on-chain assets that required latest state of the contract in order to transfer its ownership or to apply computation on it. There's no such asset in Unirep, all you have is one's reputation and proving one's reputation does not has to be done on-chain, instead the proof is transmitted to the verifier off-chain. So there's really no need to do all these computation on-chain!

So that's why the current implementation of Unirep is taking the LazyLedger-like approach - the Unirep contract (i.e., the underlying Ethereum chain) is serving as the data availability layer and the computations including proof verification all happen on top of this data availability layer. We log every user/attester actions like register/submit attestation/submit state transition proof and the according data. Then we perform state transition off-chain according to the order of when these events took place and everyone that does the same should arrive at the exact same global state! (assuming no re-org in the underlying data availability layer)

You can take a look at [`genUserStateFromContract`](https://github.com/NIC619/UniRep/blob/6e056d583bd6dcc9c12353362244dd5e6dbe3cfc/core/utils.ts#L421) to better know how a user can fetch the events from the contract and build up the latest global state.
