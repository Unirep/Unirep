#!/bin/bash -xe

cd "$(dirname "$0")"
cd ..

npx hardhat node &
sleep 3 && npx hardhat --network local test cli/test/testAllCommands.ts