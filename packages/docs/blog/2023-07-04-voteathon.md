---
slug: voteathon
title: voteathon, Built for hackers by the hackers.
authors: [vivian, chiali]
tags: [hackathon, voting, attester]
---
![](../static/img/voteathon.png)


# Overview

This summer, our UniRep group took part in the well-known IC3 conference. It's a great event for those interested in the subject of cryptography. You can learn more about IC3 from their [website](https://www.initc3.org/index.html).
We were lucky enough to show off the UniRep protocol during the event. Working with some PSE colleagues and two contributors from outside the group, we took part in a week-long project challenge.

# Motivation
Our group of seven brainstormed ideas for the project. We thought about creating an app similar to Stack Overflow where users could earn reputation points by asking and answering questions. However, we knew from past experience that this could be a complicated task. Then, while chatting about the hackathon itself, we had a new idea.

We thought about creating a voting app for hackathons. It could be driven by the community, and hackers could earn reputation points through it.
Usually, a panel of judges decides which projects are the best. But what if we made the voting anonymous and fair, and let the hackers themselves vote for the projects they like the most? This way, hackers could start building their reputation from one hackathon to the next.

We've come up with just such an app, which we're calling voteathon.

<iframe src="https://giphy.com/embed/W1Sx4lnn3tu7wEMabW" width="480" height="270" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/onmyblocktv-on-my-block-kendra-onmyblock-W1Sx4lnn3tu7wEMabW">via GIPHY</a></p>

# Idea to action

This application can better illustrate the ownership of data of unirep protocol. We want to showcase the good use cases to demonstrate the proof of reputation. In this project, hackers can choose to prove how many votes they have to claim the award. The idea of the application is that the user can use the first epoch key to join a project and receive votes. Then the second epoch key is used to prove membership in the hackathon and also is regarded as a nullifier to record the user has voted. After the judge finishes, the user can start claiming their votes. The smart contract will calculate the third highest scores of a project, then set the `winnerScore` to that number. If a user can generate a proof that the score is higher than `winnerScore`, the user can mint an NFT (or any other award the hackathon provides) to a specified address. Of course, the user will emit a nullifier as well to notice that the user has already claimed the prize.

# Let’s get started

To efficiently build a unirep app, we use `npx create-unirep-app` to create all packages we need:  circuits, contracts, relay and frontend. Then we modify the smart contracts to have the functions that are required in Voteathon: joinProject, vote, claimPrize. Then the router and frontend should also change how a ZK proof is generated and how the smart contract would be called. 

See: https://developer.unirep.io/docs/getting-started/create-unirep-app to learn more about how to use unirep related packages.

# Customization

To achieve the idea that we use the first and second epoch key in Voteathon, we need to customize the smart contract and the client.

In `joinProject` function in the smart contract, it uses `decodeEpochKeySignals` to decode the information in the public signals.

```
        Unirep.EpochKeySignals memory signals = unirep.decodeEpochKeySignals(
            publicSignals
        );

```

Note: in version v2.0.0-alpha-3, Unirep provides this decoder, but in the later version, developers have to deploy a helper first. See: https://developer.unirep.io/docs/next/contracts-api/verifiers/epoch-key-verifier-helper

Then we can check if the user reveals nonce and which nonce it is.
For example
```
        require(signals.revealNonce == 1, 'Voteathon: should reveal nonce');
        require(signals.nonce == 0, 'Voteathon: invalid nonce');

```
If the user chooses not to reveal nonce, it will all be zero.

And in `vote` function, it checks that
```
        require(signals.revealNonce == 1, 'Voteathon: should reveal nonce');
        require(signals.nonce == 1, 'Voteathon: invalid nonce');

```
to make sure the user uses two different epoch keys in different actions.

Then in the client, the users are required to generate an epoch key proof with revealing nonces.
```
        const epochKeyProof = await this.userState.genEpochKeyProof({
            nonce: 0,
            revealNonce: true,
        })

```
The options can be set to make sure the user generates the proofs with public nonces. By default the `revealNonce` is set to `false`.


# Improvement

Then we found out the circuits should be changed as well because we need a nullifier to limit how users claim prizes. Therefore, our external contributor, Joy, helps us build the nullifier circuits and the circuits for users cannot vote themselves projects. Which was a big effort because we need to compile circuits with `yarn circuits buildsnark` and generate a new verifier (with `yarn contracts build`). Then it should be imported in the smart contract, and we need to customize how users generate circuit inputs. And it is also hard to use circom to identify which public signal means which variable. We realized that building an additional circuit is not so friendly to `create-unirep-app` developers. It is neither documented nor automatically built. It was such a good lesson for us to improve the DX in the future.

Then there are many improvements we can make for Voteathon in the future. For example, the signup and joinProject could be merged to reduce the signup time. The idea is that we use manualSignup in Unirep.sol, and generate a proof that includes signup proof and epoch key proof. So it can not only sign up the user but also prove his epoch key. The second improvement that can be made is the durability. How could Voteathon smart contract be an infrastructure for every hackathon event and how the contract can be reused. It could be a challenging issue.


<iframe src="https://giphy.com/embed/zTQQPJXn1j8Jy" width="480" height="364" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/90s-80s-grunge-zTQQPJXn1j8Jy">via GIPHY</a></p>

# Future plan
This was a fun exercise for us all. There is a few things we need to continue iterating before a production release. We definitely would love this to be used in various hackathons.
Try app here: https://voteathon.org/

## Special thanks to:
- Nico Serrano  https://github.com/NicoSerranoP
- Jake C-T https://github.com/jacque006
- Ya-wen, Jeng https://github.com/vivianjeng
- AtHeartEngineer https://github.com/AtHeartEngineer
- Joy Wang  https://github.com/joyqvq 
- Simon Brown https://github.com/orbmis


## Resource:
- Repo: https://github.com/NicoSerranoP/voteathon
- Design: https://www.figma.com/file/glCnyZFoJKKfFvINALn2Z3/IC3-hackathon?type=design&node-id=0%3A1&mode=design&t=GeqvikyMM6r8DYSM-1
