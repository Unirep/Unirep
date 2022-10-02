<p align="center">
    <h1 align="center">Unirep Protocol</h1>
</p>

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

![unirep](https://user-images.githubusercontent.com/17507085/179675473-390f4058-98d5-4dc2-8e27-92aa93e7fa0f.png)
​
## 💡 About Unirep 
**UniRep** is a *private* and *non-repudiable* **reputation system**. Users can receive positive and negative reputation from attesters, and voluntarily prove that they have at least certain amount of reputation without revealing the exact amount. Moreover, users cannot refuse to receive reputation from an attester.

## 📘 Documentation

Read the [medium article](https://medium.com/privacy-scaling-explorations/unirep-a-private-and-non-repudiable-reputation-system-7fb5c6478549) to know more about the concept of Unirep protocol.
For more information, refer to the [documentation](https://docs.unirep.io/)

## 📦 Project Structure
- 
    | Package | Version | Description |
    |:--:|:--:|--|
    | [`core`](./packages/core/) | <a href="https://www.npmjs.com/package/@unirep/core"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/core?color=%230004&style=flat-square" /></a> | Unirep protocol related functions. |
    | [`contracts`](./packages/contracts/) | <a href="https://www.npmjs.com/package/@unirep/contracts"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/contracts?color=%230004&style=flat-square" /></a> | Unirep smart contracts, ZKP verifiers and contract related functions. |
    | [`circuits`](./packages/circuits/) | <a href="https://www.npmjs.com/package/@unirep/circuits"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/circuits?color=%230004&style=flat-square" /></a> | Unirep circom circuits and circuit related functions. |
    | [`crypto`](./packages/crypto) | <a href="https://www.npmjs.com/package/@unirep/crypto"><img alt="NPM version" src="https://img.shields.io/npm/v/@unirep/crypto?color=%230004&style=flat-square" /></a> | Crypto utils which are used in unirep protocol. |
    | [`subgraph`](./packages/subgraph/) | - | Subgraph of unirep smart contract. |
​
## 🛠 Install and test

Install and build

```bash
yarn & yarn build
```

Run test

```bash
yarn test
```

## 🎯 Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.
Go to [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) to learn about how to contribute to Unirep project!

## 🙌🏻 Join our community
- Discord server: <a href="https://discord.gg/VzMMDJmYc5"><img src="https://img.shields.io/discord/931582072152281188?label=Discord&style=flat-square&logo=discord"></a>
- Twitter account: <a href="https://twitter.com/UniRep_Protocol"><img src="https://img.shields.io/twitter/follow/UniRep_Protocol?style=flat-square&logo=twitter"></a>
- Telegram group: <a href="https://t.me/unirep"><img src="https://img.shields.io/badge/telegram-@unirep-blue.svg?style=flat-square&logo=telegram"></a>

## <img height="24" src="https://ethereum.org/static/a183661dd70e0e5c70689a0ec95ef0ba/13c43/eth-diamond-purple.png"> Privacy & Scaling Explorations

This project is supported by [Privacy & Scaling Explorations](https://github.com/privacy-scaling-explorations) in Ethereum Foundation.
See more projects on: https://appliedzkp.org/.