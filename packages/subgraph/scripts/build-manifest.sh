#!/usr/bin/env bash

# copy .env
cp env.sample .env

# Exit script as soon as a command fails.
set -o errexit

if [ -f .env ]; then
    # Load Environment Variables
    export $(cat .env | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}' )
fi

start_block=$START_BLOCK

# Load start block
if [[ -z $START_BLOCK ]]; then
  START_BLOCK_VAR=start_block
  START_BLOCK=${!START_BLOCK_VAR}
fi
if [[ -z $START_BLOCK ]]; then
  START_BLOCK=0
fi

# validate network
if [[ -z $UNIREP_NETWORK ]]; then
  echo 'Please make sure a Unirep deploymnet network is provided'
  exit 1
fi

# Remove previous subgraph if there is any
if [ -f subgraph.yaml ]; then
  echo 'Removing previous subgraph manifest...'
  rm subgraph.yaml
fi


# Build subgraph manifest for requested variables
echo "Preparing new subgraph for unirep address ${UNIREP_ADDRESS} to network ${UNIREP_NETWORK}"
cp subgraph.template.yaml subgraph.yaml
sed -i -e "s/{{unirepNetwork}}/${UNIREP_NETWORK}/g" subgraph.yaml
sed -i -e "s/{{unirepAddress}}/${UNIREP_ADDRESS}/g" subgraph.yaml
sed -i -e "s/{{startBlock}}/${START_BLOCK}/g" subgraph.yaml
rm -f subgraph.yaml-e


echo "subgraph.yaml generated successfully."