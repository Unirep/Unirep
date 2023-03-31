// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    ZkIdentity,
    genStateTreeLeaf,
    IncrementalMerkleTree,
} from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState, genUnirepState } from './utils'

const EPOCH_LENGTH = 1000

describe('User Signup', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            const accounts = await ethers.getSigners()
            const attester = accounts[1]
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('sign up users with no initial data', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const rootHistories = [] as any
        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)
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

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            const contractEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            const unirepEpoch = await userState.sync.loadCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const leaf = genStateTreeLeaf(
                id.secretHash,
                attester.address,
                contractEpoch.toNumber(),
                Array(userState.sync.settings.fieldCount).fill(0)
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

            userState.sync.stop()
        }

        // Check GST roots match Unirep state
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
        unirepState.stop()
    })

    it('should sign up user with initial data', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const config = await unirepContract.config()

        const id = new ZkIdentity()
        const contractEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            BigInt(attester.address)
        )

        const data = Array(config.fieldCount)
            .fill(0)
            .map((_, i) => {
                if (
                    i >= config.sumFieldCount &&
                    (i - config.sumFieldCount) % 2 ===
                        (config.sumFieldCount + 1) % 2
                ) {
                    return 0
                }
                return i + 100
            })

        const leaf = genStateTreeLeaf(
            id.secretHash,
            attester.address,
            contractEpoch.toNumber(),
            data
        )

        await unirepContract
            .connect(attester)
            .manualUserSignUp(
                contractEpoch,
                id.genIdentityCommitment(),
                leaf,
                data
            )
            .then((t) => t.wait())
        await userState.waitForSync()
        const _data = await userState.getData()
        for (let x = 0; x < config.fieldCount; x++) {
            expect(_data[x].toString()).to.equal(data[x].toString())
        }
        await userState.sync.stop()
    })
})
