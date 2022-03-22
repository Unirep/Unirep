# Unirep crypto v1.0.0

Cryptography primitives used in UniRep

## Install and build

```shell
yarn install && \
yarn build
```

## Functions

### semaphore with poseidon hash

-   `genIdentity`
-   `genIdentityCommitment`
-   `serialiseIdentity`
-   `unSerialiseIdentity`

### Sparse Merkle Tree

-   `SparseMerkleTree`

### maci-crypto@^0.9.1

-   `genRandomSalt`
-   `hash5`
-   `hashOne`
-   `hashLeftRight`
-   `stringifyBigInts`
-   `unstringifyBigInts`
-   `IncrementalMerkleTree`
-   `wrappedPoseidonT3Hash`
-   `newWrappedPoseidonT3Hash`
