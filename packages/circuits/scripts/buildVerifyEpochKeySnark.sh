#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i build/verifyEpochKey_main.circom -j build/verifyEpochKeyCircuit.r1cs -w build/verifyEpochKey.wasm -y build/verifyEpochKey.sym -pt build/powersOfTau28_hez_final_17.ptau -zk build/verifyEpochKey.zkey -vk build/verifyEpochKey.vkey.json