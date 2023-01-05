---
title: What is UniRep?
---

# 👏 Welcome

<center><img src="/img/unirep-banner.png" alt="UniRep: Privacy &#x26; provable reputation" width="800px" /></center>

## Overview

**UniRep** (**Uni**versal **Rep**utation) is a _private_ and _non-repudiable_ **reputation system**. Users can:&#x20;

1. Receive positive and negative reputation from attesters.
2. Voluntarily prove that they have at least a certain amount of reputation without revealing the exact amount.&#x20;
3. Users cannot refuse to receive reputation from an attester.

The high-level goal for **UniRep** is to be a base layer on top of which anyone can easily build _custom_, yet _interoperable_, reputation systems. For instance, users could create combined zero-knowledge proofs of reputation across different social media platforms, consumer apps, or financial applications in order to provide holistic, private, and trustworthy information about themselves to others.

Read the latest UniRep blog post [here](https://mirror.xyz/privacy-scaling-explorations.eth/FCVVfy-TQ6R7_wavKj1lCr5dd1zqRvwjnDOYRM5NtsE)

UniRep is originally proposed by BarryWhiteHat in [this ethresear.ch post](https://ethresear.ch/t/anonymous-reputation-risking-and-burning/3926)


## v2 Changes

Version 2 of the protocol reduces the complexity of user proofs to constant time. Users can receive unlimited attestations while keeping the proving time constant.

v2 also changes the tree structure, removing the user state tree completely. The global state tree and epoch tree are replaced by a state tree and epoch tree for each attester. As a result, each attester can set their own epoch length. Users also execute a user state transition per attester, instead of 1 global transition.

Read the description [here](https://github.com/unirep/unirep/issues/134).



