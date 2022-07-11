#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Create manifest
./scripts/build-manifest.sh

# Run codegen
rm -rf ./generated && graph codegen -o ./generated