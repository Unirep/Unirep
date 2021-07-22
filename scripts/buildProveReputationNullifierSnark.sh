#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/proveReputationNullifier_test.circom -j build/proveReputationNullifierCircuit.r1cs -w build/proveReputationNullifier.wasm -y build/proveReputationNullifier.sym -p build/proveReputationNullifierPk.json -v build/proveReputationNullifierVk.json -s build/ReputationNullifierVerifier.sol -vs ReputationNullifierVerifier -pr build/proveReputationNullifier.params

echo 'Copying ReputationNullifierVerifier.sol to contracts/'
cp ./build/ReputationNullifierVerifier.sol ./contracts/