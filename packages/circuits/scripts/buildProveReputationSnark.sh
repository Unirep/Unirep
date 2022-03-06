#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i build/proveReputation_main.circom -j build/proveReputationCircuit.r1cs -w build/proveReputation.wasm -y build/proveReputation.sym -pt build/powersOfTau28_hez_final_17.ptau -zk build/proveReputation.zkey -vk build/proveReputation.vkey.json