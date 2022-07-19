#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p zksnarkBuild

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i zksnarkBuild/proveNegativeReputation_main.circom -j zksnarkBuild/proveNegativeReputationCircuit.r1cs -w zksnarkBuild/proveNegativeReputation.wasm -y zksnarkBuild/proveNegativeReputation.sym -pt zksnarkBuild/powersOfTau28_hez_final_17.ptau -zk zksnarkBuild/proveNegativeReputation.zkey -vk zksnarkBuild/proveNegativeReputation.vkey.json
