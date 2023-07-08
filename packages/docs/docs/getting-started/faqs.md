---

title: FAQs
---

# ❓FAQs

**What is Unirep?**

* UniRep is an anonymous data protocol. The protocol allows developers to build applications that associate data with anonymous users. 

**What is an Attester?**
* An [Attester](https://developer.unirep.io/docs/protocol/users-and-attesters), technically, is the smart contract or an EOA (Externally Owned Account) that you will create as part of building out the application. The smart contract will be responsible for, literally, attesting the data to the anonymous user. 

- GitHub, for example, can be an attester and is responsible for managing stars and followers. 

**What is an Epoch Key?**

* [Epoch Keys](https://developer.unirep.io/docs/protocol/epoch-key) are temporary anonymous identities or personas used to interact with a Unirep application. A user will be given multiple epoch keys, and they are changed with every new epoch. The epoch keys are used to receive and prove data without associating that data with the user. Epoch Keys are similiar to ethereum wallet addreses where you can receive data from others, but others cannot link the address to one user.

**What is the architecture of a Unirep application?**

* A Unirep application will have the architecture of web app <-> relay <-> blockchain. Note that a realy is optional but if you have no relay then your ethereum address will be exposed.

**Can I build a Multi-Attester application?**
* Yes. A lot of interesting applications can be built with multiple attesters. If we understand that an Attester is technically a smart contract or EOA, then we can start to imagine how these Attesters can interact with each other. The rules of a UniRep application are set by the Attester so now you can have a rule to interact with another Attester or smart contract. A simple example is building a Multi-Attestr application where a user has 100 karma on anonymous reddit and can join another Attester where the requirement is that you have 100 karma. See the "What Can You Build With UniRep" section for more examples on this.

**How can I get started building on Unirep?**
* Refer to our [Getting started with create-unirep-app](https://developer.unirep.io/docs/getting-started/create-unirep-app) or [Getting started with typescript/javascript](https://developer.unirep.io/docs/getting-started/ts-js) section for how to bootstrap a UniRep application.

**Wen mainnet?**
- UniRep's target for mainnet is towards the end of summer!

**What is a Trusted Setup and does UniRep have one?**
- A trusted setup is a process used to establish the initial parameters and secrets required for zero-knowlegde circuits, involving a group of participants who collectively generate and contribute to these parameters while ensuring no collusion or retention of sensitive information. UniRep will have a Trusted Setup in the upcoming months.

