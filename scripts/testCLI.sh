#!/bin/bash -xe

cd "$(dirname "$0")"
cd ..

npx buidler node &
sleep 3 && npx buidler --network local test cli/test/testAllCommands.ts