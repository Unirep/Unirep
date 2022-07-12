// @ts-ignore
import { ethers as hardhatEthers, run } from 'hardhat'
import { expect } from 'chai'
import {
    ZkIdentity,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import { Unirep } from '@unirep/contracts'

import { computeInitUserStateRoot, Reputation } from '../../src'
import { genNewGST, genUnirepState, genUserState } from '../utils'

describe('User sign up events in Unirep User State', function () {
    this.timeout(0)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep

    let GSTree: IncrementalMerkleTree
    const rootHistories: BigInt[] = []

    let accounts: any[]
    const maxUsers = 100

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await run('deploy:Unirep', {
            maxUsers,
        })
        const config = await unirepContract.config()
        GSTree = genNewGST(
            config.globalStateTreeDepth,
            config.userStateTreeDepth
        )
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            let tx = await unirepContract.connect(accounts[1]).attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContract
                .connect(accounts[1])
                .setAirdropAmount(airdropPosRep)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(
                accounts[1].address
            )
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const id = new ZkIdentity()
            const initUnirepState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch =
                await initUnirepState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTree = await initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = genNewGST(
                initUnirepState.settings.globalStateTreeDepth,
                initUnirepState.settings.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
            await initUnirepState.stop()
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract
                    .connect(accounts[1])
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract.connect(accounts[1]).userSignUp(commitment)
                ).to.be.revertedWithCustomError(
                    unirepContract,
                    `UserAlreadySignedUp`
                )

                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                const attesterId = await unirepContract.attesters(
                    accounts[1].address
                )
                const airdroppedAmount = await unirepContract.airdropAmount(
                    accounts[1].address
                )
                const newUSTRoot = computeInitUserStateRoot(
                    userState.settings.userStateTreeDepth,
                    Number(attesterId),
                    Number(airdroppedAmount)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(
                    new Reputation(
                        airdroppedAmount.toBigInt(),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
                await userState.stop()
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                const newUSTRoot = computeInitUserStateRoot(
                    userState.settings.userStateTreeDepth
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
                await userState.stop()
            }
        })

        it('Check GST roots match Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            for (let root of rootHistories) {
                const exist = await unirepState.GSTRootExists(
                    root,
                    (
                        await unirepState.loadCurrentEpoch()
                    ).number
                )
                expect(exist).to.be.true
            }
            await unirepState.stop()
        })
    })
})
