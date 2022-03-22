#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p zksnarkBuild

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i zksnarkBuild/proveReputation_main.circom -j zksnarkBuild/proveReputationCircuit.r1cs -w zksnarkBuild/proveReputation.wasm -y zksnarkBuild/proveReputation.sym -pt zksnarkBuild/powersOfTau28_hez_final_17.ptau -zk zksnarkBuild/proveReputation.zkey -vk zksnarkBuild/proveReputation.vkey.json