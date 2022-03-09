# Unirep circuits v1.0.4

Circuits used in UniRep

## Install and build

```shell
yarn install && \
yarn build
```

## Test
```shell
yarn test
```

## Circuits
### `verifyEpochKey`
1. Check if user exists in the Global State Tree
2. Check nonce validity
3. Check if epoch key is computed correctly

### `startTransition`
1. Check if user exists in the Global State Tree
2. Compute blinded user state and blinded hash chain to start user state transition

### `processAttestations`
1. Verify blinded input user state
2. Verify attestation hash chain
3. Process attestations and update user state tree
4. Compute blinded user state and blinded hash chain to continue user state transition

### `userStateTransition`
1. Check if user exists in the Global State Tree
2. Process the hashchain of the epoch key specified by nonce `n`
3. Check if blinded user state matches
4. Compute and output nullifiers and new GST leaf

### `proveReputation`
1. Check if user exists in the Global State Tree and verify epoch key
2. Check if the reputation given by the attester is in the user state tree
3. Check reputation nullifiers are valid
4. Check if user has reputation greater than min_rep
5. Check pre-image of graffiti
> Hide epoch key nonce: spend reputation will not reveal a user uses which epoch key

### `proveUserSignUp`
1. Check if user exists in the Global State Tree and verify epoch key
2. Check if the reputation given by the attester is in the user state tree
3. Indicate if user has signed up in the attester's application
> Fixed epoch key nonce: one user is only allowed to get attester's airdrop once per epoch 
> Sign up flag cannot be overwritten. Once a user has signed up before, he can always prove that he has signed up.

## v1.0.4 
- Rename `CircuitName` to `Circuit`
- Add `formatProofForSnarkjsVerification` function
- Make test scripts more clean

## v1.0.3 Update log
- User can prove that he has not signed up in one leaf to get airdrop
  `proveUserSignUp` circuit: change `sign_up` from private input to public input
- Export `CircuitName` enum