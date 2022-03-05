#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

npx ts-node scripts/buildVerifiers.ts -s build/EpochKeyValidityVerifier.sol -vs EpochKeyValidityVerifier -cn verifyEpochKey

echo 'Copying EpochKeyValidityVerifier.sol to contracts/'
cp ./build/EpochKeyValidityVerifier.sol ./contracts/

npx ts-node scripts/buildVerifiers.ts -s build/ReputationVerifier.sol -vs ReputationVerifier -cn proveReputation

echo 'Copying ReputationVerifier.sol to contracts/'
cp ./build/ReputationVerifier.sol ./contracts/

npx ts-node scripts/buildVerifiers.ts -s build/UserSignUpVerifier.sol -vs UserSignUpVerifier -cn proveUserSignUp

echo 'Copying UserSignUpVerifier.sol to contracts/'
cp ./build/UserSignUpVerifier.sol ./contracts/

npx ts-node scripts/buildVerifiers.ts -s build/StartTransitionVerifier.sol -vs StartTransitionVerifier -cn startTransition

echo 'Copying StartTransitionVerifier.sol to contracts/'
cp ./build/StartTransitionVerifier.sol ./contracts/

npx ts-node scripts/buildVerifiers.ts -s build/ProcessAttestationsVerifier.sol -vs ProcessAttestationsVerifier -cn processAttestations

echo 'Copying ProcessAttestationsVerifier.sol to contracts/'
cp ./build/ProcessAttestationsVerifier.sol ./contracts/

npx ts-node scripts/buildVerifiers.ts -s build/UserStateTransitionVerifier.sol -vs UserStateTransitionVerifier -cn userStateTransition

echo 'Copying UserStateTransitionVerifier.sol to contracts/'
cp ./build/UserStateTransitionVerifier.sol ./contracts/