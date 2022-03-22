#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p zksnarkBuild

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i zksnarkBuild/verifyEpochKey_main.circom -j zksnarkBuild/verifyEpochKeyCircuit.r1cs -w zksnarkBuild/verifyEpochKey.wasm -y zksnarkBuild/verifyEpochKey.sym -pt zksnarkBuild/powersOfTau28_hez_final_17.ptau -zk zksnarkBuild/verifyEpochKey.zkey -vk zksnarkBuild/verifyEpochKey.vkey.json