#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i build/startTransition_main.circom -j build/startTransitionCircuit.r1cs -w build/startTransition.wasm -y build/startTransition.sym -pt build/powersOfTau28_hez_final_17.ptau -zk build/startTransition.zkey -vk build/startTransition.vkey.json

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i build/processAttestations_main.circom -j build/processAttestationsCircuit.r1cs -w build/processAttestations.wasm -y build/processAttestations.sym -pt build/powersOfTau28_hez_final_17.ptau -zk build/processAttestations.zkey -vk build/processAttestations.vkey.json

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i build/userStateTransition_main.circom -j build/userStateTransitionCircuit.r1cs -w build/userStateTransition.wasm -y build/userStateTransition.sym -pt build/powersOfTau28_hez_final_17.ptau -zk build/userStateTransition.zkey -vk build/userStateTransition.vkey.json