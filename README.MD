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
- so the receiver of an attestation is not an user's `identityCommitment` but an random value called `epochKey`, i.e., attester attests to an `epochKey` instead of an `identityCommitment`
    - `epochKey` is computed by `hash5(identityNullifier, epoch, nonce, 0, 0)`
        - only the user knows his `identityNullifier` so only he knows if he is receiving an attestation, others would see an attestation attesting to a random value
        - and in the circuit user can prove that he knows the `epochKey` and can rightfully receive and process the attestations attested to this `epochKey`

### Can an user choose not to process certain attestations that are bad for his reputation?
- No. The attestations to an `epochKey` would be chained together. A hashchain would be formed by the hashes of the attestations.
    - So user can not omit any attestation because the circuit requires each attestation in the hashchain to be processed.
        - if user omits an attestation, then the computed hashchain would not match the one in the Unirep contract
```
hashChainResult = hash(attestation_3, hash(attestation_2, hash(attestation_1, 0)))
```

### Data structures in Unirep

#### User state tree
- an user state tree is a sparse merkle tree with it's leaves storing reputation received from each attester, e.g.,
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
    - Also, user should perform user state transition before he can receive any attestations further. Attester can still attest to an user's epoch key in the past epoch but the user will not be able to process the attestation.

### Example flow using CLI commands

#### 1. First, spin up the testing chain
```
npx hardhat node
```
NOTE: a list of default accounts will be printed, choose one of them to be user's account and one to be attester's. User's and attester's private key will be referred to as `userPrivateKey` and `attesterPrivateKey` respectively.

#### 2. Deploy Unirep contract
```
npx ts-node cli/index.ts deploy -d userPrivateKey
```
NOTE: Unirep contract's address will be printed. e.g., `Unirep: 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B`

#### 3. Generate user's identity and identity commitment
```
npx ts-node cli/index.ts genUnirepIdentity
```
NOTE: identity and identity commitment will be printed, e.g.,
```
Identity: "[\"90213552ee6dfe0678f298822d8bf5822b4c4b80dd6202cd31b179eaaaf31d7b\",\"f3e2395b2ba7530eb5664679eddbc21760b00443ff23c1097c4b133a12ca29\",\"6deb6bcc53129fe4fe4ddd6c7903d1e9e8d8811c06caec2ec8a2765aa9ebce\"]"
Identity Commitment: cb210c915b1d72e5ded0c6c8908d778dc96002fb05d189a8c9916d770dd0438
```

#### 4. User signs up
```
npx ts-node cli/index.ts userSignup -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B... -c cb210c915b1d72e5ded0c6c8908d778dc96002fb05d189a8c9916d770dd0438 -d userPrivateKey
```
NOTE: `-x` is the Unirep contract address and `-c` is user's identity commitment

#### 5. Attester signs up
```
npx ts-node cli/index.ts attesterSignup -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d attesterPrivateKey attest
```
NOTE: `-d` is attester's private key, this private key is to be used only by this attester hereafter

#### 6. User generates epoch key and epoch key proof
```
npx ts-node cli/index.ts genEpochKeyAndProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -id "[\"90213552ee6dfe0678f298822d8bf5822b4c4b80dd6202cd31b179eaaaf31d7b\",\"f3e2395b2ba7530eb5664679eddbc21760b00443ff23c1097c4b133a12ca29\",\"6deb6bcc53129fe4fe4ddd6c7903d1e9e8d8811c06caec2ec8a2765aa9ebce\"]" -n 0
```
NOTE: `-id` is user's identity and `-n`  is epoch key nonce which should be less than the system parameter `maxEpochKeyNonce`
NOTE: epoch key and epoch key proof will be printed and they should be handed to attester to be verified

#### 7. Attester verify epoch key proof
```
npx ts-node cli/index.ts verifyEpochKeyProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -epk 88 -pf "{\"protocol\":\"groth\",\"proof\":\"139aebf4e62d8f5119d9f82ae97dc97765a2788fdc298896685e6149174dc4861724be8eb71320743698236f95e1d78a6abfe50f9bb741935c139d3d4bd223d4095faeca1776ceac4cc0c417a73e7be18c8c47369df95f4322ec466bd49c77eb260ca5377fa26f1eb42d0394c5da7953a54e8362f58f777551bd5793a7b5ef9b094d031f3b9e4782f5f536e6c4c7f00a7414185dc3db0e9f727780cb199a79921c39438cb95fa1f7944306e271967114d6cb3bd78190d5fc2f3f63c683720b241f34b6e8fd78738ddf7d4b7ffd72adf569b1d2bfc896e0ca129d2e96a8d67cc20822a9579f3da2aa67b416a0c07a44bc96d3ff4ce3e79f8913437bb9827d927b\",\"pi_a\":[\"8867667083916984444352605573184584374216800147099438727709927703509975549062\",\"10468117191145483384455024440777427612014045649682070740102792147510506955732\",\"1\"],\"pi_b\":[[\"17210230695327233045783568104770494012973270710446300780901206206563256496027\",\"4239872460647969532796967476399683339971974895082337537007557386344091908075\"],[\"12765936253943710113126735687115154206109025542882835073115005224865882049316\",\"4206884408513257695213326329865516455178566675789700890404267496339716864402\"],[\"1\",\"0\"]],\"pi_c\":[\"14114836752686037303560109772602035819144280684765524006598862094703040822466\",\"3679744346286573534991171747888053485185114622855252765731039928143868433019\",\"1\"]}"
```
NOTE: `-epk` is user's epoch key and `-pf` is the epoch key proof

#### 8. Attester attest to epoch key
```
npx ts-node cli/index.ts attest -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d attesterPrivateKey -epk 88 -pr 10 -nr 8 -gf 176ff05d9c7c4528b04553217098a71cd076d52623dab894a7f7ee34116ca170
```
NOTE: `-pr` is the positive reputation given to the user, `-nr` is the negative reputation given to the user and `-gf` is the graffiti for the reputation given to the user

#### 9. Epoch transition
```
npx ts-node cli/index.ts epochTransition -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d 0x... -t
```

NOTE: `-d` private key could be anyone's private key and `-t` indicates it's testing environment so it will fast forward to the end of epoch

#### 10. User state transition
```
npx ts-node cli/index.ts userStateTransition -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -d userPrivateKey -id "[\"90213552ee6dfe0678f298822d8bf5822b4c4b80dd6202cd31b179eaaaf31d7b\",\"f3e2395b2ba7530eb5664679eddbc21760b00443ff23c1097c4b133a12ca29\",\"6deb6bcc53129fe4fe4ddd6c7903d1e9e8d8811c06caec2ec8a2765aa9ebce\"]" -n 0
```

#### 11. User generate reputation proof
```
npx ts-node cli/index.ts genReputationProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -id "[\"90213552ee6dfe0678f298822d8bf5822b4c4b80dd6202cd31b179eaaaf31d7b\",\"f3e2395b2ba7530eb5664679eddbc21760b00443ff23c1097c4b133a12ca29\",\"6deb6bcc53129fe4fe4ddd6c7903d1e9e8d8811c06caec2ec8a2765aa9ebce\"]" -a 1 -mp 0 -mn 10 -gp 0
```
NOTE: `-a` is attester's id, `-mp` is the minimum positive reputation score, i.e, user wants to prove that the attester gave the user a positive reputation score that's larger than the minimum positive reputation score, `-mn` is the maximum negative reputation score, i.e, user wants to prove that the attester gave the user a negative reputation score that's less than the maximum negative reputation score and `-gp` is the pre-image of the graffiti for the reputation
NOTE: proof will be printed and it should be handed to the receiver of this proof

#### 12. (someone) Verify the reputation proof
```
npx ts-node cli/index.ts verifyReputationProof -x 0xb3dD32d090f05Afd6225e6b611bb25C1E87a650B -a 1 -mp 0 -mn 10 -gp 0 -pf "{\"protocol\":\"groth\",\"proof\":\"2fa0dc4339cd7a3aae8315b081ade256e9f61098f7925e2893992a0158114a19138c4420f55419271cb2ccfc6bd78168decf8288346a33841b74e341e5d3d327160d7923815a69696a4504929eba5ce3007f3c6a7c2584d1b3f74b12372a08c32c4e30f0cdc4be402ea14ed3724fbec8d89c43eb581d8c6b9297a7db1ac1209714920b9205f5fb04258c8f1b1db2184c6340eb752ce9c5933afddfe3683078d3074e6908298c9e85c08613e4d53c37c0f906e6dd5be2fc3f31a8a69bf47f041d0976f70033d35e7d14697d14d5662ce676648c226e418c10a9f55834e827290519b4ccacf3b59fb04b2708d24a34c2e4291f555cdc95929d0ed8b386c90358da\",\"pi_a\":[\"21542919610378111517868459726729146554487771022668041096937979468677081287193\",\"8841772919457017765854853618748931093962298038004245215713907996830630925095\",\"1\"],\"pi_b\":[[\"20039917184598236365818357430581303244936505768503061777162456686918870573207\",\"9974687749202553416968043475250586972797576402450240111112346564614249121987\"],[\"3304728914557216396426844320951515301779122501585436981345179214870516532253\",\"9304296499112751959737642432745561476146578786982452586231253231516832004307\"],[\"1\",\"0\"]],\"pi_c\":[\"4281008327698783193315732713800559318156084569777913424867653523343378163973\",\"11627266305272943480020635883736388264942729210935508132777949434576738932954\",\"1\"]}"
```
