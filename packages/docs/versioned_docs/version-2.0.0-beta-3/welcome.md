---
title: What is UniRep?
---

# Introduction

UniRep is a zero-knowledge protocol that securely manages user data through anonymous identifiers, enabling trustless interactions and enhanced user privacy in applications. UniRep expands the notion of reputation to include various user data aspects, such as preferences, activity, alignments, and ownership. 

Using anonymous identifiers (epoch keys), The protocol allows for trustless engagement with applications while preserving user privacy. This approach promotes non-custodial applications that don't hold user data, reducing data breach risks and emphasizing security for both users and developers.

<center><img src="/img/unirep-banner.png" alt="UniRep: Privacy &#x26; provable reputation" width="100%" /></center>

## 😸  Key Features

UniRep aims to be the ultimate foundation for constructing tailored, yet fully compatible, zero-knowledge (zk) applications. It functions as a powerful memory layer for zk, offering private, non-repudiable data storage and retrieval capabilities. With UniRep, users can effortlessly receive data, prove facts about their information, and store the results while enjoying robust privacy assurances and constant computational complexity. The protocol empowers developers to create bespoke zk applications without compromising on interoperability and efficiency.

Key UniRep features include:
- **Large Proof Storage**: UniRep facilitates the storage of extensive proofs, such as proof of Ethereum address control from an ECDSA signature, which users can later retrieve and prove multiple times.
- **Web2 Authentication Bridging**: Users authenticate once with a trusted entity via OAuth, enabling the entity to attest and store information about their web2 identity in zk format.
- **Versatile Data Storage**: UniRep accommodates a wide array of data essential to applications, including user reputation, actions taken, group memberships, and more.
- **Seamless Interoperability**: Applications can easily interconnect by enabling users to create proofs using publicly available state for user verifications.
- **No Forced Data Sharing**: With UniRep, users are never forced to receive unwanted data from applications, maintaining their freedom of choice.

## Getting started

UniRep protocol allows applications to securely attest to user data changes through the use of dynamic, short-lived identifiers known as **epoch keys**.

<center><img src="/img/user & attester flow.png" alt="UniRep: Privacy &#x26; provable reputation" width="100%" /></center>

Read the latest UniRep blog post [here](https://mirror.xyz/privacy-scaling-explorations.eth/FCVVfy-TQ6R7_wavKj1lCr5dd1zqRvwjnDOYRM5NtsE)

UniRep is originally proposed by BarryWhiteHat in [this ethresear.ch post](https://ethresear.ch/t/anonymous-reputation-risking-and-burning/3926)
