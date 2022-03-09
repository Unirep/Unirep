#!/bin/bash

cd "$(dirname "$0")"
cd ..
mkdir -p build

if [[ -f build/powersOfTau28_hez_final_17.ptau ]]
then
    exit
fi

curl -o build/powersOfTau28_hez_final_17.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_17.ptau