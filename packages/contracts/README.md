# Unirep contracts v1.0.6

## Install and build

```shell
yarn install && \
yarn build
```

## Test

```shell
yarn test
```

## Utils

-   `computeStartTransitionProofHash`
-   `computeProcessAttestationsProofHash`
-   `deployUnirep`
-   `getUnirepContract`

## Contracts

-   `Address.sol`
-   `EpochKeyValidityVerifier.sol`
-   `Hasher.sol`
-   `ProcessAttestationsVerifier.sol`
-   `ReputationVerifier.sol`
-   `SnarkConstants.sol`
-   `StartTransitionVerifier.sol`
-   `Unirep.sol`
-   `UnirepObjs.sol`
-   `UserSignUpVerifier.sol`
-   `UserStateTransitionVerifier.sol`

## v1.0.6 Update log

-   Add a `fromProofIndex` input in `submitAttestation` and `submitAttestationViaRelayer`, and emit the `fromProofIndex`
-   If the attestation is not from `spendReputation`, just input `0`
-   Check epoch key range on chain
-   Update packages

## v1.0.5 Update log

-   Remove Poseidon hash on-chain
-   Export proof struct: `EpochKeyProof`, `ReputationProof`, `SignUpProof`, `UserTransitionProof`
-   Export event enum: `Event`, `AttestationEvent`

## v1.0.4 Update log

-   Update @unirep/circuits version
-   User can prove that he has not signed up in one leaf to get airdrop
    `proveUserSignUp` circuit: change `sign_up` from private input to public input
-   New paramter `uint256 userHasSignedUp;` in `UnirepParameters.sol`
-   New input in `verifyUserSignUp` function
-   `submitAttestation`: proof index should not be zero
