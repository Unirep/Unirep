# Unirep Social subgraph

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)

UniRep is a private and nonrepudiable repuation system based on ZKP.

## Documentation

Read more about unirep [here](https://unirep.gitbook.io/unirep/introduction)

## Setup

Clone or fork repository from GitHub

```bash
  git clone git@github.com:Unirep/Unirep.git
  cd Unirep/packages/subgraph
  yarn install
```

### Compiling

```bash
  yarn run codegen && yarn run build
```

### Deploying

To deploy, you'll need your auth token from thegraph dashboard.

```bash
graph auth --product hosted-service <AUTH_TOKEN_HERE>
```

```bash
  yarn run deploy
```

## Demo

The subgraph is presently deployed [here](https://thegraph.com/hosted-service/subgraph/iamonuwa/unirep).

This query

```bash
{
  reputationEntities {
    id
    createdAt
    posRep
    negRep
    graffiti
    user {
      id
      createdAt
      identityCommitment
      attesterId
      epochKey
      airdropRep
    }
  }
}
```

will return this as result

```bash
{
  "data": {
    "reputationEntities": [
      {
        "id": "0x054334ed864038412792daeb1f7060fd864961c50761fc2020e5363aaded87fe0",
        "createdAt": "1649539777",
        "posRep": "0",
        "negRep": "0",
        "graffiti": "0",
        "user": {
          "id": "0x15d76961f7f9ed383e132add82257458d590ef55",
          "createdAt": "1649565733",
          "identityCommitment": "18926337200484736318947765217640540000000000000000000000000000000000000000000",
          "attesterId": "1",
          "epochKey": "208",
          "airdropRep": "30"
        }
      }, ...
    ]
  }
}
```

<!-- ## Running Tests

To run tests, run the following command

```bash
  npm run test
``` -->

## Contributing

Contributions are always welcome!

See [CONTRIBUTING.md](https://github.com/Unirep/Unirep-Social/blob/main/CONTRIBUTING.md) for ways to get started.

Please adhere to this Unirep's [code of conduct](https://github.com/Unirep/Unirep-Social/blob/main/CODE_OF_CONDUCT.md).
