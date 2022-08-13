// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { deployUnirep, Unirep } from '@unirep/contracts'

import { Reputation, computeInitUserStateRoot } from '../../src'
import { genUserState, genUnirepState, genNewGST } from '../utils'

describe('User sign up proof (Airdrop proof) events in Unirep User State', function () {
    this.timeout(30 * 60 * 1000)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep

    let accounts: any[]
    let attester
    let attesterId
    const maxUsers = 100
    const attestingFee = ethers.utils.parseEther('0.1')
    const fromProofIndex = 0
    const rootHistories = [] as any
    let GSTree

    before(async () => {
        accounts = await hardhatEthers.getSigners()
        attester = accounts[2]

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
            attestingFee,
        })
        const config = await unirepContract.config()
        GSTree = genNewGST(
            config.globalStateTreeDepth,
            config.userStateTreeDepth
        )
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            let tx = await unirepContract.connect(attester).attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = await unirepContract.attesters(attester.address)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const airdropAmount = 100

                const tx = await unirepContract
                    .connect(attester)
                    ['userSignUp(uint256,uint256)'](commitment, airdropAmount)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract
                        .connect(attester)
                        ['userSignUp(uint256,uint256)'](
                            commitment,
                            airdropAmount
                        )
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

                const newUSTRoot = computeInitUserStateRoot(
                    userState.settings.userStateTreeDepth,
                    Number(attesterId),
                    Number(airdropAmount)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)

                signUpAirdrops.push(
                    new Reputation(
                        BigInt(airdropAmount),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
                await userState.stop()
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract
                    .connect(attester)
                    ['userSignUp(uint256)'](commitment)
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
                    userState.settings.userStateTreeDepth,
                    Number(attesterId),
                    Number(0)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)

                signUpAirdrops.push(Reputation.default())
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
