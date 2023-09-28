//@ts-ignore
import { ethers } from 'hardhat'
import { deployUnirep, deployVerifierHelper } from '@unirep/contracts/deploy'
import { Identity } from '@semaphore-protocol/identity'
import {
    UnirepVoting__factory,
    VotingPrizeNFT__factory,
} from '@unirep/contracts/typechain'
import {} from '@unirep/contracts/typechain/contracts/UnirepVoting.sol'

import {
    genProofAndVerify,
    genReputationCircuitInput,
} from '@unirep/circuits/test/utils'
import { Circuit, ReputationProof } from '@unirep/circuits'
import { assert, expect } from 'chai'
import { genUserState } from './utils'

async function genUserStateInternal(id, app) {
    // generate a user state
    const unirepAddress = await app.unirep()
    const attesterId = BigInt(app.address)
    const userState = await genUserState(
        ethers.provider,
        unirepAddress,
        id,
        attesterId
    )
    await userState.sync.start()
    await userState.waitForSync()
    return userState
}

describe('Voting', function () {
    this.timeout(0)
    let unirep
    let voting
    let nft

    const numTeams = 6
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
            deployer,
            Circuit.proveReputation
        )
        const epochKeyVerifierHelper = await deployVerifierHelper(
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
            const userState = await genUserStateInternal(voters[i], voting)
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await voting.userSignUp(publicSignals, proof).then((t) => t.wait())
            userState.sync.stop()
        }
    })

    it('hackers sign up', async () => {
        for (let i = 0; i < numHackers; i++) {
            const userState = await genUserStateInternal(hackers[i], voting)
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await voting.userSignUp(publicSignals, proof).then((t) => t.wait())
            userState.sync.stop()
        }
    })

    it('hackers join project', async () => {
        for (let i = 0; i < numHackers; i++) {
            const userState = await genUserStateInternal(hackers[i], voting)
            const projectID = i % numTeams
            // generate epoch key proof
            const { publicSignals, proof } = await userState.genEpochKeyProof({
                nonce: 0,
                revealNonce: true,
            })
            await voting
                .joinProject(projectID, publicSignals, proof)
                .then((t) => t.wait())
            userState.sync.stop()
        }
    })

    it('vote project', async () => {
        for (let i = 0; i < numVoters; i++) {
            const userState = await genUserStateInternal(voters[i], voting)
            const option = i % 2
            const projectID = i % numTeams
            const count = await voting.counts(projectID)
            const epoch_keys = new Array()
            for (let j = 0; j < count; j++) {
                const epoch_key = await voting.participants(projectID, j)
                epoch_keys.push(epoch_key)
            }

            const { publicSignals, proof } = await userState.genEpochKeyProof({
                nonce: 1,
                revealNonce: true,
            })

            await voting
                .vote(projectID, option, publicSignals, proof)
                .then((t) => t.wait())
            userState.sync.stop()
        }
    })

    it('user state transition', async () => {
        await ethers.provider.send('evm_increaseTime', [epochLength])
        await ethers.provider.send('evm_mine', [])

        for (let i = 0; i < numHackers; i++) {
            const newEpoch = await unirep.attesterCurrentEpoch(voting.address)
            const userState = await genUserStateInternal(hackers[i], voting)
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    toEpoch: newEpoch,
                })
            await unirep
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
            userState.sync.stop()
        }
    })

    it('claim prize with reputation proof', async () => {
        const scores: any = []
        for (let i = 0; i < numTeams; i++) {
            scores.push((await voting.scores(i)).toNumber())
        }
        scores.sort()
        for (let i = 0; i < numVoters; i++) {
            const userState = await genUserStateInternal(voters[i], voting)
            const attesterId = 219090124810
            const circuitInputs = genReputationCircuitInput({
                id: voters[i],
                epoch: 20,
                nonce: 1,
                attesterId,
                startBalance: [5, 1],
                minRep: 2,
                proveMinRep: 1,
                revealNonce: 1,
            })

            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.proveReputation,
                circuitInputs
            )

            assert(isValid, 'reputation proof is not valid')
            const data = new ReputationProof(publicSignals, proof)
            const accounts = await ethers.getSigners()

            await voting
                .claimPrize(
                    accounts[i + 1].address,
                    data.publicSignals,
                    data.proof
                )
                .then((t) => t.wait())
            expect(
                (await nft.balanceOf(accounts[i + 1].address)).toString()
            ).equal('1')
            userState.sync.stop()
        }
    })
})
