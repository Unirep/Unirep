---

title: FAQs
---

# ❓FAQs

### What is UniRep?

UniRep is an anonymous data attestation protocol, providing developers with a pre-built, audited system to create zero-knowledge applications that associate data with anonymous users. 
- UniRep is built and maintained as a public good. The protocol is 100% open source and free to use. 
- UniRep is part of Privacy & Scaling Explorations (PSE), a multidisciplinary team supported by the Ethereum Foundation.

### What is an Attester?
An [Attester](./protocol/users-and-attesters.md) is the smart contract that is created when building out a UniRep application; its rules are defined by the app developer. The attester contract will interact with the UniRep protocol contract to securely attest to data changes for the app's anonymous users. 
- e.g. GitHub could be an attester, and would attest to data representing a user's stars and followers. 

### What is an Epoch Key?

[Epoch Keys](./protocol/epoch-key) are temporary anonymous identities or personas used to interact with a Unirep application. A user will be given multiple epoch keys, and they are changed with every new epoch. The epoch keys are used to receive and prove data without associating that data with the user. Users are able to prove ownership of the total data accumulated by all of their epoch keys. 
- Epoch Keys are similiar to Ethereum wallet addreses in that users can receive data from others, but each user's activity or history cannot be traced back to their persistent identity.

### What is the architecture of a Unirep application?

A Unirep application will have the architecture of web app <-> relay <-> blockchain. Note that use of the relay is optional, but without it, users' Ethereum addresses will be exposed when interacting with the attester.

<center><img src="/img/architecture.png" alt="Unirep: architecture of client, relay and blockchain" width="100%" /></center>

### Can I build a Multi-Attester application?
Yes! Many interesting applications can be built with multiple attester systems. With the understanding that an attester is essentially a smart contract, there are infinite ways to imagine how attester contracts can interact with each other. A UniRep app could be comprised of multiple attesters (e.g. managing separate groups with unique membership requirements), or could be designed to interact with other attesters across the ecosystem.

### What applications can be built with UniRep?

Please check the examples here: 
- [what you can build with UniRep](./what-can-i-build)
- [applications built by our core contributors](./welcome#application-built-by-our-core-contributors)

### How can I get started building on Unirep?
Unirep provides a convenient package to bootstrap an attester application. Refer to one of the following to learn more:
- [Getting started with create-unirep-app](./getting-started/create-unirep-app)
- [Getting started with typescript/javascript](./getting-started/ts-js)


### What is a Trusted Setup and does UniRep have one?
A Trusted Setup is the process used to establish the initial parameters and secrets required for zero-knowlegde circuits, involving a group of participants who collectively generate and contribute to these parameters while ensuring no collusion or retention of sensitive information. UniRep will have a Trusted Setup Ceremony in the upcoming months.

### Wen mainnet?
UniRep's target for mainnet is towards the end of summer!
