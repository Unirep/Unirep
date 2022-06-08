// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { Unirep } from '@unirep/contracts'

import { genUnirepState } from '../../src'
import { config, zkFilesPath } from '../testConfig'
import { UnirepProtocol } from '../../src/UnirepProtocol'
import { attesterSignUp, deploy, genIdentity, setAirdrop } from '../utils'

describe('User sign up events in Unirep State', function () {
    this.timeout(0)

    // attesters
    let accounts: ethers.Signer[]
    let attester, attesterAddr
    let attesterId

    // users
    let userIds: ZkIdentity[] = []

    // unirep contract and protocol
    const protocol = new UnirepProtocol(zkFilesPath)
    let unirepContract: Unirep

    // test config
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    const airdropPosRep = 10

    // global variables
    let GSTree = protocol.genNewGST()
    const rootHistories: BigInt[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], config)
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester = accounts[2]
            const success = await attesterSignUp(unirepContract, attester)
            expect(success, 'Attester signs up failed').to.equal(1)
            attesterAddr = await attester.getAddress()
            attesterId = await unirepContract.attesters(attesterAddr)
        })

        it('attester set airdrop amount', async () => {
            await setAirdrop(unirepContract, attester, airdropPosRep)
        })
    })

    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(0)

            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = protocol.genNewGST()
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const { id, commitment } = genIdentity()
                userIds.push(id)

                const tx = await unirepContract
                    .connect(attester)
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract.connect(attester).userSignUp(commitment)
                ).to.be.revertedWith('Unirep: the user has already signed up')

                const unirepState = await genUnirepState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(i + 1)

                const attesterId = await unirepContract.attesters(attesterAddr)
                const airdroppedAmount = await unirepContract.airdropAmount(
                    attesterAddr
                )
                const newUSTRoot = await protocol.computeInitUserStateRoot(
                    Number(attesterId),
                    Number(airdroppedAmount)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const { id, commitment } = genIdentity()
                userIds.push(id)

                const tx = await unirepContract.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                const unirepState = await genUnirepState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(userNum + i + 1)

                const newUSTRoot = await protocol.computeInitUserStateRoot()
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const unirepStateBefore = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepEpoch = unirepStateBefore.currentEpoch
            const unirepGSTLeavesBefore =
                unirepStateBefore.getNumGSTLeaves(unirepEpoch)

            const { id, commitment } = genIdentity()
            await expect(
                unirepContract.userSignUp(commitment)
            ).to.be.revertedWith(
                'Unirep: maximum number of user signups reached'
            )

            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(unirepGSTLeavesBefore)
        })

        it('Check GST roots match Unirep state', async () => {
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(
                    root,
                    unirepState.currentEpoch
                )
                expect(exist).to.be.true
            }
        })
    })
})
