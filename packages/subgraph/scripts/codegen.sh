#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Create manifest
npm run build

# Run codegen
rm -rf ./generated && graph codegen -o ./generated