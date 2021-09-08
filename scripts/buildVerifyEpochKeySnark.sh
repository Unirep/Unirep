#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/verifyEpochKey_test.circom -j build/verifyEpochKeyCircuit.r1cs -w build/verifyEpochKey.wasm -y build/verifyEpochKey.sym -s build/EpochKeyValidityVerifier.sol -vs EpochKeyValidityVerifier -pt build/powersOfTau28_hez_final_17.ptau -zk build/verifyEpochKey.zkey -vk build/verifyEpochKey.vkey.json

echo 'Copying EpochKeyValidityVerifier.sol to contracts/'
cp ./build/EpochKeyValidityVerifier.sol ./contracts/