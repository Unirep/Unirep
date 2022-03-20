#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p zksnarkBuild

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i zksnarkBuild/startTransition_main.circom -j zksnarkBuild/startTransitionCircuit.r1cs -w zksnarkBuild/startTransition.wasm -y zksnarkBuild/startTransition.sym -pt zksnarkBuild/powersOfTau28_hez_final_17.ptau -zk zksnarkBuild/startTransition.zkey -vk zksnarkBuild/startTransition.vkey.json

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i zksnarkBuild/processAttestations_main.circom -j zksnarkBuild/processAttestationsCircuit.r1cs -w zksnarkBuild/processAttestations.wasm -y zksnarkBuild/processAttestations.sym -pt zksnarkBuild/powersOfTau28_hez_final_17.ptau -zk zksnarkBuild/processAttestations.zkey -vk zksnarkBuild/processAttestations.vkey.json

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i zksnarkBuild/userStateTransition_main.circom -j zksnarkBuild/userStateTransitionCircuit.r1cs -w zksnarkBuild/userStateTransition.wasm -y zksnarkBuild/userStateTransition.sym -pt zksnarkBuild/powersOfTau28_hez_final_17.ptau -zk zksnarkBuild/userStateTransition.zkey -vk zksnarkBuild/userStateTransition.vkey.json