#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/startTransition_test.circom -j build/startTransitionCircuit.r1cs -w build/startTransition.wasm -y build/startTransition.sym -p build/startTransitionPk.json -v build/startTransitionVk.json -s build/StartTransitionVerifier.sol -vs StartTransitionVerifier -pr build/startTransition.params -r

echo 'Copying StartTransitionVerifier.sol to contracts/'
cp ./build/StartTransitionVerifier.sol ./contracts/

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/processAttestations_test.circom -j build/processAttestationsCircuit.r1cs -w build/processAttestations.wasm -y build/processAttestations.sym -p build/processAttestationsPk.json -v build/processAttestationsVk.json -s build/ProcessAttestationsVerifier.sol -vs ProcessAttestationsVerifier -pr build/processAttestations.params -r

echo 'Copying ProcessAttestationsVerifier.sol to contracts/'
cp ./build/ProcessAttestationsVerifier.sol ./contracts/

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/userStateTransition_test.circom -j build/userStateTransitionCircuit.r1cs -w build/userStateTransition.wasm -y build/userStateTransition.sym -p build/userStateTransitionPk.json -v build/userStateTransitionVk.json -s build/UserStateTransitionVerifier.sol -vs UserStateTransitionVerifier -pr build/userStateTransition.params -r

echo 'Copying UserStateTransitionVerifier.sol to contracts/'
cp ./build/UserStateTransitionVerifier.sol ./contracts/