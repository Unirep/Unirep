---
slug: unirep-travels-to-turkey-2023
title: UniRep Travels to Turkey, 2023
authors: [anthony]
tags: [unirep in turkey]
---

<img src="static/img/../../../static/img/engin-yapici-WA1u0scVLZU-unsplash.jpg" alt="Alt Text" width="600" style="display: block; margin: 0 auto;">


# UniRep Travels to Turkey

In April, the [UniRep Protocol](https://developer.unirep.io/) was presented to a group of software engineers interested in privacy-related technology at the [ETHPrivacy](https://www.leadingprivacy.com/istanbul) conference for a privacy hackathon in Istanbul, Turkey.

The location for the event was relevant as Turkey is one of the fastest-growing countries for the adoption of blockchain-related products. More importantly, there are concerns within Turkey about freedom of speech and other human rights where privacy can help, so it made sense to have a privacy conference there.

UniRep allows developers to build applications where a user's data is always in control of the user. A higher-level description is that the data is on a blockchain, and a user submits a zero-knowledge proof proving ownership over an epoch key that had data attested to it. Examples will follow if that does not make sense quite yet (checkout our [docs](https://developer.unirep.io/docs/welcome) if you want to dive in immediately).

One idea a hacker had at the hackathon was creating a completely anonymous GitHub. In 2023, this seems germane because of the arrest of Tornado Cash developer Alexey Pertsev, who was arrested for simply writing code (which is speech). The question, though, is how could UniRep be used to create this anonymous GitHub? Or another good question: how can we know who should be pushing to the main branch, for example, if the developer is anonymous and we are not sure of their credibility or experience?

The term "reputation" in UniRep's name might be confusing at first. Some may first think about reputation being what a certain social group may think about them. In the context of UniRep, though, reputation is data. With this in mind, we can start to imagine what data can be associated with an anonymous developer that can build their "reputation" so they can push to main.

To illustrate, let's assume you have specific criteria for selecting developers who can push to the main branch, such as requiring a certain number of stars on their projects, a minimum of 5 personal projects, and/or X amount of commits on a project on branches that are not the main branch. UniRep has the capacity to do all of that. Check out the hackathon project [here](https://github.com/gagichce/zk-dev), which was bootstrapped with [create-unirep-app](https://developer.unirep.io/docs/getting-started/create-unirep-app) (note: this will direct you to V2 beta 3 of the protocol). All the mentioned GitHub data can be linked to their anonymous identity, lending credibility to their anon identities.

Simplistically, what UniRep allows developers to do is _associate data_ with _anonymous users_; UniRep is acting as memory for zk-applications in this regard.

Another example from the hackathon was from the ODTU group in Istanbul, associated with Middle East Technical University. Their project was a zero-knowledge DAO where anonymous developers can create and vote on proposals anonymously with the support of an anonymous transfer of ERC-20 tokens! You can check out their [source](https://github.com/onuruci/zk-dao) here.

UniRep is a generalized protocol and can be used to build any application you can dream of. We are currently reviewing our version 2 audit and making fixes to tidy up any loose ends and prepare for a full release of version 2 of the protocol! Exciting times ahead for the protocol and the zk-ecosystem as interest keeps rising.

**References:**

-   https://github.com/gagichce/zk-dev
-   https://github.com/onuruci/zk-dao
