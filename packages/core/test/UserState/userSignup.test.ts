// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts/deploy'

import { Reputation, genGSTLeaf } from '../../src'
import { genUserState, genUnirepState, genNewGST } from '../utils'

const EPOCH_LENGTH = 1000

describe('User sign up events in Unirep User State', function () {
    this.timeout(30 * 60 * 1000)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []

    let unirepContract

    let accounts: any[]
    const maxUsers = 100
    const rootHistories = [] as any
    let GSTree

    before(async () => {
        const accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(accounts[0])
        const config = await unirepContract.config()
        GSTree = genNewGST(config.globalStateTreeDepth)
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            const accounts = await ethers.getSigners()
            await unirepContract
                .connect(accounts[1])
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users with no airdrop', async () => {
            const accounts = await ethers.getSigners()
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)
                const userState = await genUserState(
                    ethers.provider,
                    unirepContract.address,
                    id,
                    accounts[1].address
                )
                const { publicSignals, proof } =
                    await userState.genUserSignUpProof()

                const tx = await unirepContract
                    .connect(accounts[0])
                    .userSignUp(publicSignals, proof)
                    .then((t) => t.wait())

                const contractEpoch = await unirepContract.currentEpoch(
                    accounts[1].address
                )
                const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                const leaf = genGSTLeaf(
                    id.identityNullifier,
                    accounts[1].address,
                    contractEpoch.toNumber(),
                    0,
                    0
                )
                GSTree.insert(leaf)
                rootHistories.push(GSTree.root)

                const onchainGSTExists = await unirepContract.stateTreeRoots(
                    accounts[1].address,
                    contractEpoch,
                    GSTree.root
                )
                expect(onchainGSTExists).to.be.true

                await userState.stop()
            }
        })

        it('Check GST roots match Unirep state', async () => {
            const accounts = await ethers.getSigners()
            const unirepState = await genUnirepState(
                ethers.provider,
                unirepContract.address,
                accounts[1].address
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
