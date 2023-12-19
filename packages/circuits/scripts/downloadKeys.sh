#!/bin/bash

# TODO: improve this script
DIR="zksnarkBuild"

mkdir ${DIR}
cd ${DIR}

CIRCUITS="epochKey epochKeyLite reputation scopeNullifier signup userStateTransition"
URL="https://keys.unirep.io/2.0.0"

for circuit in ${CIRCUITS}
do
    rm -f "${circuit}.vkey.json"
    rm -f "${circuit}.zkey"
    rm -f "${circuit}.wasm"
    wget "${URL}/${circuit}.vkey.json"
    wget "${URL}/${circuit}.zkey"
    wget "${URL}/${circuit}.wasm"
done