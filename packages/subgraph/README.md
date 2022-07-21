# Unirep subgraph

The subgraph is used to query data from Unirep smart contract.

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://eslint.org/">
        <img alt="Linter eslint" src="https://img.shields.io/badge/linter-eslint-8080f2?style=flat-square&logo=eslint" />
    </a>
    <a href="https://prettier.io/">
        <img alt="Code style prettier" src="https://img.shields.io/badge/code%20style-prettier-f8bc45?style=flat-square&logo=prettier" />
    </a>
</p>


<div align="center">
    <h4>
        <a href="https://discord.gg/VzMMDJmYc5">
            🤖 Chat &amp; Support
        </a>
    </h4>
</div>

---

## 📽 Compile

```bash
yarn build
```

## 🖼 Deploy

To deploy, you'll need your auth token from thegraph dashboard.

```bash
graph auth --product hosted-service <AUTH_TOKEN_HERE>
```
Then run

```bash
yarn deploy
```

## 💻 Demo

The subgraph is presently deployed [here](https://thegraph.com/hosted-service/subgraph/unirep/unirep).

This query

```sql
{
  userEntities(first: 5) {
    id
    createdAt
    identityCommitment
    attesterId
  }
  reputationEntities(first: 5) {
    id
    createdAt
    posRep
    negRep
  }
}
```

will return this as result

```json
{
  "data": {
    "userEntities": [
      {
        "id": "0x15d76961f7f9ed383e132add82257458d590ef55",
        "createdAt": "1649565733",
        "identityCommitment": "18926337200484736318947765217640540000000000000000000000000000000000000000000",
        "attesterId": "1"
      }
    ],
    "reputationEntities": []
  }
}
```

<!-- ## Running Tests

To run tests, run the following command

```bash
  yarn test
``` -->

## 🎯 Contributing

Contributions are always welcome!
See [CONTRIBUTING.md](https://github.com/Unirep/Unirep-Social/blob/main/CONTRIBUTING.md) for ways to get started.
Please adhere to this Unirep's [code of conduct](https://github.com/Unirep/Unirep-Social/blob/main/CODE_OF_CONDUCT.md).
