---
title: "Example: UniRep Voting contract"
---

This is an example contract that utilizes the core UniRep contract and the Voting Prize NFT contract. It can help users anonymously join a hackathon project, anonymously vote, and anonymously claim prize.
`UnirepoVoting.sol` is initialized with the number of projects and `VotingPrizeNFT.sol`. 

There are two types of users: hackers and voters. A hacker can join a project of a certain project ID. The voters and hackers can vote for a project ID with one upvote or one downvote. 

The project ID has the highest number of vote counts is the winner. All hackers that are part of the project ID can claim an NFT prize.  

To deploy the UnirepVoting contract, we need to first deploy `Unirep`, `EpochKeyVerifierHelper`,  `ReputationVerifierHelper`, `VotingPrizeNFT`. Then initialize the UnirepVoting contract with the deployed addresses and numTeams. 

```typescript
import {
    UnirepVoting__factory,
    VotingPrizeNFT__factory,
} from '@unirep/contracts/typechain'

  const unirep = await deployUnirep(deployer)
  const unirepAddress = await unirep.getAddress()
  const reputationVerifierHelper = await deployVerifierHelper(
      unirepAddress,
      deployer,
      Circuit.reputation
  )
  const epochKeyVerifierHelper = await deployVerifierHelper(
      unirepAddress,
      deployer,
      Circuit.epochKey
  )
  const nftF = new VotingPrizeNFT__factory(deployer)
  const nft = await nftF.deploy(
      'ipfs://QmNtYnjqeqWbRGC4R7fd9DCXWnQF87ufv7S2zGULtbSpLA'
  )
  await nft.waitForDeployment()

  const votingF = new UnirepVoting__factory(deployer)
  const voting = await votingF.deploy(
      unirepAddress,
      await reputationVerifierHelper.getAddress(),
      await epochKeyVerifierHelper.getAddress(),
      await nft.getAddress(),
      numTeams,
      epochLength
  )
  await voting.waitForDeployment()
  const votingAddress = await voting.getAddress()
  await nft.setVotingAddress(votingAddress).then((t) => t.wait())
```
## userSignUp

Submit a signup zk proof for a user based on its user state. 

```sol
function userSignUp(
  uint[] calldata publicSignals,
  uint[8] calldata proof
) public
```

## joinProject

A hacker can join a project by submitting the project ID, the epoch key proof and public signals. 

The projectID must be within the range of numProjects. The public signals must contain `revealNonce = true` and `nonce = 0`. At most 10 hackers can join one project. Epoch key proof must be valid, see [`EpochKeyVerifierHelper`](./verifiers/epoch-key-verifier-helper.md). To generate the epoch key proof: 
```typescript
const { publicSignals, proof } = await userState.genEpochKeyProof({
     nonce: 0,
     revealNonce: true,
})
```

```sol
function joinProject(
    uint256 projectID,
    uint256[] memory publicSignals,
    uint256[8] memory proof
) public
```

## vote

Either a hacker or a voter can vote for a project ID with one of the options (upvote or downvote) along with an epoch key proof and public signals. 

The projectID must be within the range of numProjects. The public signal must contain revealNonce = true and nonce = 0. Each hacker or voter can vote at most once. 

The epoch key proof must be valid, see [`EpochKeyVerifierHelper`](./verifiers/epoch-key-verifier-helper.md). 

```sol
function vote(
    uint256 projectID,
    Option option,
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public
```

## claimPrize

A hacker that belongs to the project ID with the highest score can claim the prize NFT by submitting an address, the reputation proof and its public signals. The minRep in the public signal must be larger or equal than the recorded winner score. A hacker can claim a prize at most once. 

The reputation proof must be valid, see [`ReputationVerifierHelper`](./verifiers/reputation-verifier-helper.md). 

```sol
function claimPrize(
    address receiver,
    uint256[] calldata publicSignals,
    uint256[8] calldata proof
) public
```