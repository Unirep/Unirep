#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Run codegen
yarn codegen

# Run build
npx graph build