#!/bin/bash

set -e


cd "$(dirname "$0")"
cd ..

BUILD_FOLDER=./build
VERIFIER_CONTRACT_FOLDER=./contracts/verifiers

mkdir -p $BUILD_FOLDER
mkdir -p  $VERIFIER_CONTRACT_FOLDER

npx ts-node scripts/buildVerifiers.ts -s $BUILD_FOLDER/EpochKeyValidityVerifier.sol -vs EpochKeyValidityVerifier -cn verifyEpochKey

echo 'Copying EpochKeyValidityVerifier.sol to verifiers folder'
cp $BUILD_FOLDER/EpochKeyValidityVerifier.sol  $VERIFIER_CONTRACT_FOLDER

npx ts-node scripts/buildVerifiers.ts -s $BUILD_FOLDER/ReputationVerifier.sol -vs ReputationVerifier -cn proveReputation

echo 'Copying ReputationVerifier.sol to verifers folders'
cp $BUILD_FOLDER/ReputationVerifier.sol  $VERIFIER_CONTRACT_FOLDER

npx ts-node scripts/buildVerifiers.ts -s $BUILD_FOLDER/UserSignUpVerifier.sol -vs UserSignUpVerifier -cn proveUserSignUp

echo 'Copying UserSignUpVerifier.sol to verifers folders'
cp $BUILD_FOLDER/UserSignUpVerifier.sol  $VERIFIER_CONTRACT_FOLDER

npx ts-node scripts/buildVerifiers.ts -s $BUILD_FOLDER/StartTransitionVerifier.sol -vs StartTransitionVerifier -cn startTransition

echo 'Copying StartTransitionVerifier.sol to verifers folders'
cp $BUILD_FOLDER/StartTransitionVerifier.sol  $VERIFIER_CONTRACT_FOLDER

npx ts-node scripts/buildVerifiers.ts -s $BUILD_FOLDER/ProcessAttestationsVerifier.sol -vs ProcessAttestationsVerifier -cn processAttestations

echo 'Copying ProcessAttestationsVerifier.sol to verifers folders'
cp $BUILD_FOLDER/ProcessAttestationsVerifier.sol  $VERIFIER_CONTRACT_FOLDER

npx ts-node scripts/buildVerifiers.ts -s $BUILD_FOLDER/UserStateTransitionVerifier.sol -vs UserStateTransitionVerifier -cn userStateTransition

echo 'Copying UserStateTransitionVerifier.sol to verifers folders'
cp $BUILD_FOLDER/UserStateTransitionVerifier.sol  $VERIFIER_CONTRACT_FOLDER