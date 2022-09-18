// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight, genStateTreeLeaf } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState, genUnirepState, genNewGST } from './utils'

const EPOCH_LENGTH = 1000

describe('User Signup', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract

    const rootHistories = [] as any
    let GSTree

    before(async () => {
        const accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(accounts[0])
        const config = await unirepContract.config()
        GSTree = genNewGST(config.globalStateTreeDepth)
    })

    it('attester sign up', async () => {
        const accounts = await ethers.getSigners()
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    it('sign up users with no airdrop', async () => {
        const accounts = await ethers.getSigners()
        for (let i = 0; i < 5; i++) {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                BigInt(accounts[1].address)
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            const tx = await unirepContract
                .connect(accounts[1])
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            const contractEpoch = await unirepContract.attesterCurrentEpoch(
                accounts[1].address
            )
            const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const leaf = genStateTreeLeaf(
                id.identityNullifier,
                accounts[1].address,
                contractEpoch.toNumber(),
                0,
                0
            )
            GSTree.insert(leaf)
            rootHistories.push(GSTree.root)

            const onchainGSTExists =
                await unirepContract.attesterStateTreeRootExists(
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
            BigInt(accounts[1].address)
        )
        for (let root of rootHistories) {
            const exist = await unirepState.GSTRootExists(
                root,
                Number(await unirepState.loadCurrentEpoch())
            )
            expect(exist).to.be.true
        }
        await unirepState.stop()
    })
})
