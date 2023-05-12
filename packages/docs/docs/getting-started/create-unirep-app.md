---

title: Getting Started with create-unirep-app
---

# 🚀 Getting Started with `create-unirep-app`

We have developed the [create-unirep-app](https://www.npmjs.com/package/create-unirep-app) package which provides developers with a convenient and efficient way to build their own applications that leverage the power of UniRep.


## 💻 Run the application locally
### Installation

1. Run:
```shell
npx create-unirep-app
```
or 

2. Clone the [Unirep/create-unirep-app](https://github.com/unirep/create-unirep-app) repository:
```shell
git clone https://github.com/unirep/create-unirep-app && \
cd create-unirep-app && \
yarn
```

### Build the files

Go to the app directory and run:

```shell
yarn build
```

### Start a blockchain environment with hardhat

```shell
yarn contracts hardhat node
```

:::info
See [hardhat tutorial](https://hardhat.org/hardhat-runner/docs/getting-started#quick-start)
:::

### Deploy smart contracts

The app builder will deploy the `UnirepApp.sol` smart contract, which is an **[attester](../protocol/users-and-attesters.md#attesters-🤖)**, to interact directly with `Unirep.sol`.

In a new terminal window, deploy smart contracts with the following command from root:

```shell
yarn contracts deploy
```

Both `Unirep.sol` and `UnirepApp.sol` will be deployed in the hardhat environment.<br/>
:::info
If `Unirep.sol` has been deployed in the testnet, specify the address of the `Unirep.sol` in the `UnirepApp` constructor
```solidity
constructor(
   Unirep _unirep,
   ...
)
```
:::
And the configurations will be written to `create-unirep-app/config.ts`

### Start a relayer (backend)

The app builder can host a relayer to handle a request from the frontend and post transactions to the blockchain.<br/>
Also, it can provide proving keys for frontend prover.

:::info
Relayer is optional for a unirep application. <br/>
But if users send transactions to `UnirepApp.sol` directly, the users' privacy could be compromised.
:::

Start a relayer with the following command from root:

```shell
yarn relay start
```

When `Listening on port 8000` displays in terminal, you can run a frontend in a new terminal window.

### Start a frontend server

The frontend is the **[user](../protocol/users-and-attesters.md#users-👤)**s' interface to interact with the attester (`UnirepApp.sol`).

In a new terminal window, start a frontend server with the following command from root:

```shell
yarn frontend start
```

The frontend will be running at `http://127.0.0.1:3000/` by default.

### Create-Unirep-App Architecture


It is important to note the architecture of this application is different than traditional dapps. Traditionally, dapps have to force users to use a browser wallet, get eth, understand gas fees, etc. This is poor UX because of the large learning curve users will have to endure. 

With Create-Unirep-App, the architecture is Web App <-> Relay <-> Blockchain which reduces the cognitive load of a user new to blockchain appplications by abstracting the learning curve into the relay:

![Architecture](https://imgur.com/VdmLjZe.png)


## 🕹️ Open frontend to interact with the application

### User Sign up

Click on the **Join** button.

![Join](https://i.imgur.com/vcR3x9D.png)

'Join' will prompt the client to generate a [semaphore identity](https://semaphore.appliedzkp.org/) and a [signup proof](../circuits-api/circuits.md#signup-proof). <br/>
The relayer will submit the signup proof to `UnirepApp.sol` and the user will keep the semaphore identity secretly in the browser.
After the transaction successfully submitted, the window will show a **Dashboard** button.

![Dashboard](https://i.imgur.com/NURZkvA.png)

### Information

<a href="https://imgur.com/8922mih"><img src="https://i.imgur.com/8922mih.png" title="Information" width="300"/></a>

#### Epoch

The [epoch](../protocol/epoch.md) information will be shown on the **Epoch** section.

#### Latest Data

It shows the latest [data](../protocol/data.md) of the user, including the requested data and [provable data](#provable-data). <br/>
It will be changed after each data requesting.

#### Provable Data

After [user state transition](../protocol/user-state-transition.md), the user can prove the data he owns. <br/>
It cannot be changed until next user state transition.

### Request Data

<a href="https://imgur.com/qUDm4nB"><img src="https://i.imgur.com/qUDm4nB.png" title="Request data" width="400"/></a>

#### Change Data

In the example application, the user can request how much [data](../protocol/data.md) he wants to receive. <br/>
There are two types of data field: *sum field* and *replacement field*. <br/>
The data in *sum field* can only be added together by a new data. <br/>
The data in *replace field* will be only replaced by a new data. <br/>

Also, the user can choose which anonymous identifier ([epoch key](../protocol/epoch-key.md)) they want to receieve attestations with by choosing an *epoch key nonce*. <br/>
With a different epoch key nonce, the user will generate a totally different identifier. <br/>
e.g.
```shell
# epoch key nonce = 0
Requesting data with epoch key:
0x2b4b15e0173f69807318198d5c1db6c00c44380af2e05912608950e10ba04b43
# epoch key nonce = 1
Requesting data with epoch key:
0x15e1358a646a10aa99756a250d9463b6026fbd09c5f4d28e477085f21eecd197
```

Each epoch key can receive data and that data is accumulated to a user.

e.g. <br/>
`data[0] = 1` is requested by epoch key: `0x2b4b15e0173f69807318198d5c1db6c00c44380af2e05912608950e10ba04b43`<br/>
`data[0] = 2` is requested by epoch key: `0x15e1358a646a10aa99756a250d9463b6026fbd09c5f4d28e477085f21eecd197`

The final `data[0]` of the user is `3` since 1 + 2 = 3

:::caution
These epoch keys only last for one epoch. If the epoch updates, new epoch keys will be generated and old epoch keys become invalid.
:::

#### Attest

After the user clicks the **attest** button, an attestation will happen and following steps take place:
1. User generates an epoch key proof to prove the epoch key is valid.
2. User submits the epoch key proof and the requested data to the relayer.
3. Relayer uses `UnirepApp.sol` to call [attest](../contracts-api/unirep-sol.md#attest) in `Unirep.sol` 

### User State Transtion

<a href="https://imgur.com/Gly6cti"><img src="https://i.imgur.com/Gly6cti.png" title="User state transition" width="300"/></a>

If `Current epoch #` does not equal to `Latest transition epoch` (found under the Epoch section), a [user state transition](../protocol/user-state-transition.md) should be performed to be able to receive more data. 
The user state transition should be done manually by users. <br/>
The following steps take place for a user state transition:
1. Generate a [user state transition proof](../circuits-api/circuits.md#user-state-transition-proof)
2. Submit the proof to the relayer
3. Relayer updates the `Unirep.sol` contract

Then the [provable data](#provable-data) will be updated because the latest user status is recorded on-chain.<br/>
The user can use the provable data to generate a [data proof](#prove-data).

### Prove Data

<a href="https://imgur.com/6hDmLSs"><img src="https://i.imgur.com/6hDmLSs.png" title="Prova data" width="200" /></a>

It proves that each claim data field is more than the provable data field.

:::info
See the customized [data proof circuit](https://github.com/Unirep/create-unirep-app/blob/2ca9aaa3fcacb9282993b8f5d5917afc482ec089/packages/circuits/circuits/dataProof.circom)<br/>
The app builders can customize their own ZK circuits and deploy verifiers to fit the application.
:::

e.g.

If user's provable data is:
```shell
Provable Data 0 = 2
Provable Data 1 = 3
Provable Data 2 = 4
Provable Data 3 = 5
```
and user can claim he has data:
```shell
Claim Data 0 = 2
Claim Data 1 = 2
Claim Data 2 = 2
Claim Data 3 = 2
```

since:
```shell
2 (Provable Data 0) >= 2 (Claim Data 0) # satisfied. 2 === 2
3 (Provable Data 1) >= 2 (Claim Data 1) # satisfied. 3 > 2
4 (Provable Data 2) >= 2 (Claim Data 2) # satisfied. 4 > 2
5 (Provable Data 3) >= 2 (Claim Data 3) # satisfied. 5 > 2
```

If the proof is valid, it shows the proof and "Is proof valid? **true**" below the 'Generate Proof' button. <br/>
If the proof is invalid, the snarkjs prover throws an error.

e.g.

If user's provable data is:
```shell
Provable Data 0 = 2 👈
Provable Data 1 = 3
Provable Data 2 = 4
Provable Data 3 = 5
```
and user claims he has data:
```shell
Claim Data 0 = 3 👈
Claim Data 1 = 3
Claim Data 2 = 3
Claim Data 3 = 3
```

It throws an error since the fields where the emojis are do not satisfy the conditions:

```shell
2 (Provable Data 0) >= 3 (Claim Data 0) # not satisfied. 2 is not greater than or equal to 3
```

## 💡 Build your own application

Start with modifying the [`UnirepApp.sol`](https://github.com/Unirep/create-unirep-app/blob/2ca9aaa3fcacb9282993b8f5d5917afc482ec089/packages/contracts/contracts/UnirepApp.sol).

:::info
See all [`Unirep.sol` APIs](../contracts-api/unirep-sol.md)
:::

### Change epoch length

Each attester has its own [epoch](../protocol/epoch.md) length. <br/>
If the epoch is too long: users will use the same epoch keys for a long time, new data cannot be proved immediately, and you risk making users pseudoanonymous because of the re-use of epoch keys. <br/>
If the epoch is too short: epoch keys last for a short period and the user does not have enough time to receive much data.

```sol
unit48 epochLength = 60 * 15; // 15 minutes
unirep.attesterSignUp(epochLength);
```

:::info
See [attesterSignUp](../contracts-api/unirep-sol.md#attestersignup)
:::

### Change attestation policy

If users can request as much data as they want, the data will not be valuable in this app. 🙁 <br/>
Try to give each epoch key only `1` data 0 value in each epoch.

Here is an example of creating a simple mapping to track if an epoch key recieved a value after an attetation was submitted to that epoch key:

```sol
mapping(uint => bool) epochKeyReceivedValue;

function submitAttestation(
   uint epochKey
) public {
   // check if the epoch key receives data or not
   require(epochKeyReceivedValue[epochKey] == false);
   // compute attester ID: the address of the smart contract
   uint160 attesterId = uint160(address(this));
   // get current epoch from unirep
   uint48 targetEpoch = unirep.attesterCurrentEpoch(attesterId);
   // fix field index
   uint fieldIndex = 0;
   // fix data value
   uint val = 1;
   // call unirep attest function
   unirep.attest(
      epochKey,
      targetEpochs,
      fieldIndex,
      val
   );
   // mark the epoch key has received data
   epochKeyReceivedValue[epochKey] = true;
}
```

:::info
See [`attesterCurrentEpoch`](../contracts-api/unirep-sol.md#attestercurrentepoch), [`attest`](../contracts-api/unirep-sol.md#attest)
:::

### Verify epoch key on-chain

Wait. What if a user requests data with an invalid epoch key? 😨 <br/>
Don't worry. The attester contract can force users to provide valid epoch keys with an [epoch key proof](../circuits-api/circuits.md#epoch-key-proof).<br/>

For example, we can change the function inputs with an epoch key proof:

```sol
function submitAttestation(
   uint[] memory publicSignals,
   uint[8] memory proof
) public {
   // verify epoch key proof
   unirep.verifyEpochKeyProof(publicSignals, proof);
}
```

:::info
See [`verifyEpochKeyProof`](../contracts-api/unirep-sol.md#verifyepochkeyproof)
:::

But how can we tell which signal is epoch key?<br/>
`Unirep.sol` also provides [`decodeEpochKeySignals`](../contracts-api/unirep-sol.md#decodeepochkeysignals) to fix this problem.

We can complete the `submitAttestation` function with `decodeEpochKeySignals`.

```sol
mapping(uint => bool) epochKeyReceivedValue;

function submitAttestation(
   uint[] memory publicSignals,
   uint[8] memory proof
) public {
   // verify epoch key proof
   unirep.verifyEpochKeyProof(publicSignals, proof);
   // decode epoch key signals
   Unirep.EpochKeySignals memory signals = unirep.decodeEpochKeySignals(publicSignals);
   // check if the epoch key receives data or not
   require(epochKeyReceivedValue[signals.epochKey] == false);
   // compute attester ID: the address of the smart contract
   uint160 attesterId = uint160(address(this));
   // get current epoch from unirep
   uint48 targetEpoch = unirep.attesterCurrentEpoch(attesterId);
   // fix field index
   uint fieldIndex = 0;
   // fix data value
   uint val = 1;
   // call unirep attest function
   unirep.attest(
      signals.epochKey,
      targetEpoch,
      fieldIndex,
      val
   );
   // mark the epoch key has received data
   epochKeyReceivedValue[signals.epochKey] = true;
}
```

Now, you can start building your own application with UniRep. 🚀

