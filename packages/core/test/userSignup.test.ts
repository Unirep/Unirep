// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    ZkIdentity,
    genStateTreeLeaf,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState, genUnirepState } from './utils'

const EPOCH_LENGTH = 1000

describe('User Signup', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract

    const rootHistories = [] as any
    let stateTree

    before(async () => {
        const accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(accounts[0])
        const config = await unirepContract.config()
        stateTree = new IncrementalMerkleTree(config.stateTreeDepth)
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    it('sign up users with no airdrop', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        for (let i = 0; i < 5; i++) {
            const id = new ZkIdentity()
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                BigInt(attester.address)
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            const tx = await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            const contractEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            const unirepEpoch = await userState.loadCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const leaf = genStateTreeLeaf(
                id.identityNullifier,
                attester.address,
                contractEpoch.toNumber(),
                0,
                0,
                0,
                0
            )
            stateTree.insert(leaf)
            rootHistories.push(stateTree.root)

            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attester.address,
                    contractEpoch,
                    stateTree.root
                )
            expect(stateRootExists).to.be.true

            await userState.stop()
        }
    })

    it('Check GST roots match Unirep state', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            BigInt(attester.address)
        )
        for (let root of rootHistories) {
            const exist = await unirepState.stateTreeRootExists(
                root,
                Number(await unirepState.loadCurrentEpoch())
            )
            expect(exist).to.be.true
        }
        await unirepState.stop()
    })
})
