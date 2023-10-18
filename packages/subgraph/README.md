<p align="center">
    <h1 align="center">UniRep Subgraph Package</h1>
</p>

UniRep subgraph schema and deployment.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://eslint.org/">
        <img alt="Linter eslint" src="https://img.shields.io/badge/linter-eslint-8080f2?style=flat-square&logo=eslint">
    </a>
    <a href="https://prettier.io/">
        <img alt="Code style prettier" src="https://img.shields.io/badge/code%20style-prettier-f8bc45?style=flat-square&logo=prettier">
    </a>
    <a href="https://dl.circleci.com/status-badge/redirect/gh/Unirep/Unirep/tree/main">
        <img alt="Circle CI" src="https://img.shields.io/circleci/build/github/Unirep/Unirep/main?style=flat-square">
    </a>
</p>

<div align="center">
    <h4>
        <a href="https://discord.gg/VzMMDJmYc5">
            🤖 Chat &amp; Support
        </a>
    </h4>
</div>


## Build

Build `.yaml` for subgraph deployment. (Default: https://127.0.0.1:8545)

```sh
yarn build
```

Build `.yaml` for testnets. For example: `sepolia`

```sh
NETWORK=sepolia yarn build
```

Supported networks: see [networks.json](./networks.json)

## Deploy

### Hosted service

Create a subgraph in the dashboard: https://thegraph.com/hosted-service/dashboard

```sh
yarn deploy
```

Specify the name where you will deploy the subgraph. e.g. `unirep/goerli`.

### Studio

Create a subgraph in the dashboard: https://thegraph.com/studio/

```sh
graph deploy --studio <STUDIO_NAME>
```

## Test

```sh
yarn test
```