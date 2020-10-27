#!/bin/bash -xe

cd "$(dirname "$0")"
cd ..

npx hardhat node &
# npx hardhat node would enforce compiling the contracts so Poseidon contracts need to be rebuilt
sleep 3 && npx ts-node scripts/buildPoseidon.ts && npx hardhat --network local --no-compile test cli/test/testAllCommands.ts