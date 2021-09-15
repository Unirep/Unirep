#!/bin/bash -xe

cd "$(dirname "$0")"
cd ..

npx hardhat node &
sleep 6
# npx hardhat node would enforce compiling the contracts so Poseidon contracts need to be rebuilt
NODE_OPTIONS=--max-old-space-size=4096 npx hardhat --network local test --no-compile cli/test/testAllCommands.ts