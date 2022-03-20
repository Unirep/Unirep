#!/bin/bash

cd "$(dirname "$0")"
cd ..
mkdir -p zksnarkBuild

if [[ -f zksnarkBuild/powersOfTau28_hez_final_17.ptau ]]
then
    exit
fi

curl -o zksnarkBuild/powersOfTau28_hez_final_17.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_17.ptau