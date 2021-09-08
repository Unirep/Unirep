#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/proveReputation_test.circom -j build/proveReputationCircuit.r1cs -w build/proveReputation.wasm -y build/proveReputation.sym -s build/ReputationVerifier.sol -vs ReputationVerifier -pt build/powersOfTau28_hez_final_17.ptau -zk build/proveReputation.zkey -vk build/proveReputation.vkey.json

echo 'Copying ReputationVerifier.sol to contracts/'
cp ./build/ReputationVerifier.sol ./contracts/