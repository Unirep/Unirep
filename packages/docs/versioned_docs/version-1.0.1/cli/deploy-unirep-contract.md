---
description: Deploy a Unirep smart contract with an Ethereum account
---

# Deploy Unirep Contract

* Config an ethereum provider before deploying a Unirep smart contract.
* Default: run a local hardhat node by

```
npx hardhat node
```

:::info
By default it runs at [http://localhost:8545](http://localhost:8545)<br/>
And it will list 20 accounts including their private keys
:::

## `deploy`

```bash
npx ts-node cli/index.ts deploy 
                  [-h] 
                  [-d DEPLOYER_PRIVKEY] 
                  [-e ETH_PROVIDER] 
                  [-l EPOCH_LENGTH] 
                  [-f ATTESTING_FEE]
```

* The address of the Unirep contract should be printed after executing the command.
* Then we have to use the address to perform the following actions.

### Options

```
  -d DEPLOYER_PRIVKEY, --deployer-privkey DEPLOYER_PRIVKEY
                        The deployer's Ethereum private key
  -e ETH_PROVIDER, --eth-provider ETH_PROVIDER
                        A connection string to an Ethereum provider. Default: http://localhost:8545
  -l EPOCH_LENGTH, --epoch-length EPOCH_LENGTH
                        The length of an epoch in seconds. Default: 30
  -f ATTESTING_FEE, --attesting-fee ATTESTING_FEE
                        The fee to make an attestation. Default: 0.01 eth (i.e., 10 * 16)
```

#### Options inherited from parent commands <a href="#options-inherited-from-parent-commands" id="options-inherited-from-parent-commands"></a>

```
  -h, --help            Show this help message and exit.
```

:::info
source: [core/cli/deploy.ts](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/core/cli/deploy.ts)
:::
