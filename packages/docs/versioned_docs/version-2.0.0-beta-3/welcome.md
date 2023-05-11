---
title: What is UniRep?
---

# Introduction

UniRep is a zero-knowledge protocol that securely manages user data through anonymous identifiers, enabling trustless interactions and enhanced user privacy in applications. UniRep expands the notion of reputation to include various user data aspects, such as preferences, activity, alignments, and ownership. 

Using anonymous identifiers (epoch keys), the protocol allows for trustless engagement with applications while preserving user privacy. This approach promotes non-custodial applications that don't hold user data, reducing data breach risks and emphasizing security for both users and developers.

<center><img src="/img/unirep-banner.png" alt="UniRep: Private user data with &#x26; provable reputation" width="100%" /></center>

## 😸  Key Features

UniRep aims to be the ultimate foundation for constructing tailored, yet fully compatible, zero-knowledge (zk) applications. It functions as a powerful memory layer for zk, offering private, non-repudiable data storage and retrieval capabilities. With UniRep, users can effortlessly receive data, prove facts about their information, and store the results while enjoying robust privacy assurances and constant computational complexity. The protocol empowers developers to create bespoke zk applications without compromising on interoperability and efficiency.

Key UniRep features include:
- **Data Storage**: UniRep facilitates the data storage can be extended with any zk logic, like proving ECDSA public key control. [Example](https://github.com/Unirep/zketh/blob/b7e0fdf3dcc1b3f97673da20837ed9c7d3e27c9f/packages/circuits/circuits/signupWithAddress.circom)
- **Versatile Data Storage**: UniRep accommodates a wide array of data essential to applications, including user reputation, actions taken, group memberships, and more.
- **Seamless Interoperability**: Applications can easily interconnect by enabling users to create proofs using publicly available state for user verifications.
- **No Forced Data Sharing**: With UniRep, users are never forced to receive unwanted data from applications, maintaining their freedom of choice.

<center><img src="/img/application.png" alt="UniRep: Private user data with &#x26; provable reputation" width="100%" /></center>

##  🤠  Design & Deploy a customized attester

Attesters are at the application layer. They are the platforms, businesses, and communities in the ZK social ecosystem. They act as world builders and community managers. Attesters have great flexibility in what to build. They decide how many user identities are used, how users are onboarded, and how users interact with each other. Most importantly, attesters decides the format of user data including what attributes are stored and tracked. In other words, attesters provide accountability.

:::info
UniRep's key offering is providing developers with a pre-built, audited system to create apps that securely handle private user data and manage reputation using ZK technology. UniRep protocol allows applications to securely attest to user data changes through the use of dynamic, short-lived identifiers known as **epoch keys**.

:::
### Application built by our core contributors ###

- Built by [Vimwitch](https://github.com/vimwitch),  Do things with ethereum addresses in zk: ZKETH [Repo](https://github.com/Unirep/zketh) App [Try it now](https://zketh.io/) or [Canon party](https://canon.party)
- Built by [Vimwitch](https://github.com/vimwitch),  DAO: ZKDAO [Repo](https://github.com/vimwitch/zkdao) 
- Built by [Kittybest](https://github.com/kittybest),  Web2 Authentication Bridging: My Badge [Repo](https://github.com/kittybest/my-badge)
- Built by [CJ](https://github.com/CJ-Rose) ,  Craiglist reinvent: Trustlist [Repo](https://github.com/CJ-Rose/trustlist)
- Built by UniRep team, Social network with reputation touch: Unirep.social [Repo](https://github.com/unirep/unirep-social)


### Other ideas Few for you to get started

- Non-custodial shopping, streaming
- Business review / recommendations
- B2B reputation
- P2P marketplace
- P2P gig services
- Product review
- Video rating
...and more.

In summary, UniRep empowers developers to create applications that foster trust and alignment within the platform, all while ensuring users maintain complete privacy. This unique combination of features enhances user experience, promotes engagement, and supports the growth of a secure and trusted digital community.



## Stay informed
Have questions? Join our [UniRep Discord](https://discord.gg/qrqq8SeN7F) 

Read the latest UniRep blog post [here](https://mirror.xyz/privacy-scaling-explorations.eth/FCVVfy-TQ6R7_wavKj1lCr5dd1zqRvwjnDOYRM5NtsE)

UniRep is originally proposed by BarryWhiteHat in [this ethresear.ch post](https://ethresear.ch/t/anonymous-reputation-risking-and-burning/3926)
