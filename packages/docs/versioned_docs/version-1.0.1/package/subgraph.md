---
description: The subgraph is used to query data from Unirep smart contract.
---

# @unirep/subgraph

[![](https://camo.githubusercontent.com/5124fc18e7c4eea90190045bc66eddafb19a7b4d93c696e88c65dc530cec9b02/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f70726f6a6563742d756e697265702d626c75652e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep)[![Github license](https://camo.githubusercontent.com/9dc25f9a3042124b664e5c386b48a35246c09e7fa0e514bf151c2034b183ec62/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f756e697265702f756e697265702e7376673f7374796c653d666c61742d737175617265) ](https://github.com/unirep/unirep/blob/master/LICENSE)[![Linter eslint](https://camo.githubusercontent.com/ed5849d453eb089b4ad8f56f316f492ceef5e7aa5404ee4df4d97ff6cb3f375f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c696e7465722d65736c696e742d3830383066323f7374796c653d666c61742d737175617265266c6f676f3d65736c696e74) ](https://eslint.org/)[![Code style prettier](https://camo.githubusercontent.com/81082ed03d1efb3d135c66d183ce379d0d30a0091d09d472f5e96ab4e2ff4375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f636f64652532307374796c652d70726574746965722d6638626334353f7374796c653d666c61742d737175617265266c6f676f3d7072657474696572)](https://prettier.io/)

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
See [CONTRIBUTING.md](https://github.com/Unirep/Unirep/blob/main/CONTRIBUTING.md) for ways to get started.
Please adhere to this Unirep's [code of conduct](https://github.com/Unirep/Unirep/blob/main/CODE_OF_CONDUCT.md).
