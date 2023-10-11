//@ts-ignore
import { ethers } from 'hardhat'
import { deployUnirep, deployVerifierHelper } from '@unirep/contracts/deploy'
import { Identity } from '@semaphore-protocol/identity'
import {
    UnirepVoting__factory,
    VotingPrizeNFT__factory,
} from '@unirep/contracts/typechain'

import { Circuit } from '@unirep/circuits'
import { expect } from 'chai'
import { genUserState } from './utils'

describe('Voting', function () {
    this.timeout(0)
    let unirep
    let voting
    let nft

    const numTeams = 4
    const numVoters = 6
    const numHackers = 7
    const epochLength = 300

    // generate random identidies for all voters
    const voters = Array(numVoters)
        .fill(0)
        .map((n) => {
            return new Identity()
        })

    const hackers = Array(numHackers)
        .fill(0)
        .map((n) => {
            return new Identity()
        })

    it('deployment', async function () {
        const [deployer] = await ethers.getSigners()
        unirep = await deployUnirep(deployer)
        const reputationVerifierHelper = await deployVerifierHelper(
            unirep.address,
            deployer,
            Circuit.proveReputation
        )
        const epochKeyVerifierHelper = await deployVerifierHelper(
            unirep.address,
            deployer,
            Circuit.epochKey
        )
        const nftF = new VotingPrizeNFT__factory(deployer)
        nft = await nftF.deploy(
            'ipfs://QmNtYnjqeqWbRGC4R7fd9DCXWnQF87ufv7S2zGULtbSpLA'
        )
        await nft.deployed()

        const votingF = new UnirepVoting__factory(deployer)
        voting = await votingF.deploy(
            unirep.address,
            reputationVerifierHelper.address,
            epochKeyVerifierHelper.address,
            nft.address,
            numTeams,
            epochLength
        )
        await nft.setVotingAddress(voting.address).then((t) => t.wait())
        await voting.deployed()
    })

    it('voter sign up', async () => {
        for (let i = 0; i < numVoters; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirep.address,
                voters[i],
                voting.address
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await voting.userSignUp(publicSignals, proof).then((t) => t.wait())
            userState.stop()
        }
    })

    it('hackers sign up', async () => {
        for (let i = 0; i < numHackers; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirep.address,
                hackers[i],
                voting.address
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await voting.userSignUp(publicSignals, proof).then((t) => t.wait())
            userState.stop()
        }
    })

    it('hackers join project', async () => {
        for (let i = 0; i < numHackers; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirep.address,
                hackers[i],
                voting.address
            )
            const projectID = i % numTeams
            // generate epoch key proof
            const { publicSignals, proof } = await userState.genEpochKeyProof({
                nonce: 0,
                revealNonce: true,
            })
            await voting
                .joinProject(projectID, publicSignals, proof)
                .then((t) => t.wait())
            userState.stop()
        }
    })

    it('vote project', async () => {
        for (let i = 0; i < numVoters; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirep.address,
                voters[i],
                voting.address
            )
            const option = i % 2
            const projectID = i % numTeams
            const count = await voting.counts(projectID)
            for (let j = 0; j < count; j++) {
                await voting.participants(projectID, j)
            }

            const { publicSignals, proof } = await userState.genEpochKeyProof({
                nonce: 1,
                revealNonce: true,
            })

            await voting
                .vote(projectID, option, publicSignals, proof)
                .then((t) => t.wait())
            userState.stop()
        }
    })

    it('user state transition', async () => {
        await ethers.provider.send('evm_increaseTime', [epochLength])
        await ethers.provider.send('evm_mine', [])

        for (let i = 0; i < numHackers; i++) {
            const newEpoch = await unirep.attesterCurrentEpoch(voting.address)
            const userState = await genUserState(
                ethers.provider,
                unirep.address,
                hackers[i],
                voting.address
            )
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    toEpoch: newEpoch,
                })
            await unirep
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
            userState.stop()
        }
    })

    it('claim prize with reputation proof', async () => {
        const scores: any = []
        for (let i = 0; i < numTeams; i++) {
            scores.push((await voting.scores(i)).toNumber())
        }
        scores.sort()

        for (let i = 0; i < numHackers; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirep.address,
                hackers[i],
                voting.address
            )
            const data = await userState.getData()
            if (data[0] - data[1] !== BigInt(scores[numTeams - 1])) continue
            const { publicSignals, proof } =
                await userState.genProveReputationProof({
                    minRep: scores[numTeams - 1],
                    revealNonce: true,
                    epkNonce: 1,
                })

            const accounts = await ethers.getSigners()

            await voting
                .claimPrize(accounts[i + 1].address, publicSignals, proof)
                .then((t) => t.wait())
            expect(
                (await nft.balanceOf(accounts[i + 1].address)).toString()
            ).equal('1')
            userState.stop()
        }
    })
})
