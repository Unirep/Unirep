# Unirep monorepo

## About Unirep

UniRep is a private and nonrepudiable repuation system. Users can receive positive and negative reputation from attesters, and voluntarily prove that they have at least certain amount of reputation without revealing the exact amount. Moreover, users cannot refuse to receive reputation from an attester.

For more information, refer to the [documentation](https://unirep.gitbook.io/unirep/)

## Project Structure

-   Composed by 4 packages:
    -   [`core`](./packages/core/) - main package.
    -   [`config`](./packages/config) - declarations of protocol constants
    -   [`contracts`](./packages/contracts/) - Unirep smart contracts.
    -   [`circuits`](./packages/circuits/) - Circom libaries.
    -   [`crypto`](./packages/crypto) - Crypto utils.

## Install and test

Install

```bash
yarn && yarn build
```

Run test

```bash
yarn test
```
