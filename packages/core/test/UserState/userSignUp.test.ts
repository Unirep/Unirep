// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    ZkIdentity,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import { deployUnirep, Unirep } from '@unirep/contracts'

import {
    computeInitUserStateRoot,
    genUnirepState,
    genUserState,
    Reputation,
} from '../../src'
import { genNewGST } from '../utils'

describe('User sign up events in Unirep User State', function () {
    this.timeout(0)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep

    let treeDepths
    let GSTree: IncrementalMerkleTree
    const rootHistories: BigInt[] = []

    let accounts: ethers.Signer[]
    const attester = new Object()
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
        })
        treeDepths = await unirepContract.treeDepths()
        GSTree = genNewGST(
            treeDepths.globalStateTreeDepth,
            treeDepths.userStateTreeDepth
        )
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()

            let tx = await unirepContract
                .connect(attester['acct'])
                .attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContract
                .connect(attester['acct'])
                .setAirdropAmount(airdropPosRep)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(
                attester['addr']
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
                treeDepths.globalStateTreeDepth,
                treeDepths.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract
                    .connect(attester['acct'])
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract
                        .connect(attester['acct'])
                        .userSignUp(commitment)
                ).to.be.revertedWith(`UserAlreadySignedUp(${commitment})`)

                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                const attesterId = await unirepContract.attesters(
                    attester['addr']
                )
                const airdroppedAmount = await unirepContract.airdropAmount(
                    attester['addr']
                )
                const newUSTRoot = await computeInitUserStateRoot(
                    treeDepths.userStateTreeDepth,
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
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
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

                const newUSTRoot = await computeInitUserStateRoot(
                    treeDepths.userStateTreeDepth
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            const userStateBefore = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const GSTRootBefore = (await userStateBefore.genGSTree(1)).root

            await expect(
                unirepContract.userSignUp(commitment)
            ).to.be.revertedWith('ReachedMaximumNumberUserSignedUp()')

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const GSTRoot = (await userState.genGSTree(1)).root
            expect(GSTRoot).equal(GSTRootBefore)
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
        })
    })
})
