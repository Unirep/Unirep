---
title: What is UniRep?
---

# 👏 Welcome

<center><img src="/img/unirep-banner.png" alt="UniRep: Privacy &#x26; provable reputation" width="800px" /></center>

## Overview

**UniRep** (**Uni**versal **Rep**utation) is a _private_ and _non-repudiable_ data storage and retrieval system. Applications can attest to changes in user data using short lived identifiers called **epoch keys**. Users can:

1. Receive data from applications.
2. Voluntarily prove facts about their user data.
3. Users cannot refuse to receive data from an application.

The high-level goal for **UniRep** is to be a base layer on top of which anyone can easily build _custom_, yet _interoperable_, zk applications. UniRep acts as a memory layer for zk: anything stored in UniRep can be retrieved and proven with strong privacy guarantees and constant computation complexity.

UniRep can be used to store the result of large proofs (e.g. proof of Ethereum address control from an ECDSA signature). This result can later be retrieved and proven by a user any number of times. Similar patterns exist for web2 authentication bridging; a user oauths with a trusted entity once, and the entity attests storing information about the users web2 identity in zk.

UniRep can be used to store data important to applications. This might include reputation the user has accrued, actions the user has taken, groups the user is a member of, or anything else. Applications can interoperate by having users make proofs using publicly available state roots.

**Read the latest UniRep blog post on [Privacy & Scaling Explorations](https://mirror.xyz/privacy-scaling-explorations.eth/FCVVfy-TQ6R7_wavKj1lCr5dd1zqRvwjnDOYRM5NtsE)**

UniRep is originally proposed by BarryWhiteHat in [this ethresear.ch post](https://ethresear.ch/t/anonymous-reputation-risking-and-burning/3926)
