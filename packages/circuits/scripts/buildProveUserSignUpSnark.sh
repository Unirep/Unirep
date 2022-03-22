#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p zksnarkBuild

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i zksnarkBuild/proveUserSignUp_main.circom -j zksnarkBuild/proveUserSignUpCircuit.r1cs -w zksnarkBuild/proveUserSignUp.wasm -y zksnarkBuild/proveUserSignUp.sym -pt zksnarkBuild/powersOfTau28_hez_final_17.ptau -zk zksnarkBuild/proveUserSignUp.zkey -vk zksnarkBuild/proveUserSignUp.vkey.json