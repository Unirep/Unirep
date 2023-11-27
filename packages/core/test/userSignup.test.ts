// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    genIdentityHash,
    genStateTreeLeaf,
    IncrementalMerkleTree,
} from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState, genUnirepState, EPOCH_LENGTH } from './utils'

describe('User Signup', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract
    let unirepAddress
    let chainId

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        unirepAddress = await unirepContract.getAddress()
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId
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
        const attesterId = await attester.getAddress()
        const rootHistories = [] as any
        const config = await unirepContract.config()
        const stateTreeDepth = Number(config.stateTreeDepth)
        const stateTree = new IncrementalMerkleTree(stateTreeDepth)
        for (let i = 0; i < 5; i++) {
            const id = new Identity()
            const userState = await genUserState(
                ethers.provider,
                unirepAddress,
                id,
                BigInt(attesterId)
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            const contractEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            const unirepEpoch = await userState.sync.loadCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const leaf = genStateTreeLeaf(
                id.secret,
                attesterId,
                contractEpoch,
                Array(userState.sync.settings.fieldCount).fill(0),
                chainId
            )
            stateTree.insert(leaf)
            rootHistories.push(stateTree.root)

            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attesterId,
                    contractEpoch,
                    stateTree.root
                )
            expect(stateRootExists).to.be.true

            userState.stop()
        }

        // Check GST roots match Unirep state
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepAddress,
            BigInt(attesterId)
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
        const attesterId = await attester.getAddress()
        const config = await unirepContract.config()

        const id = new Identity()
        const contractEpoch = await unirepContract.attesterCurrentEpoch(
            attesterId
        )
        const userState = await genUserState(
            ethers.provider,
            unirepAddress,
            id,
            BigInt(attesterId)
        )

        const fieldCount = Number(config.fieldCount)
        const sumFieldCount = Number(config.sumFieldCount)
        const data = Array(fieldCount)
            .fill(0)
            .map((_, i) => {
                return i + 100
            })

        const idHash = genIdentityHash(
            id.secret,
            attesterId,
            contractEpoch,
            chainId
        )

        await unirepContract
            .connect(attester)
            .manualUserSignUp(contractEpoch, id.commitment, idHash, data)
            .then((t) => t.wait())
        console.log('wait for sync')
        await userState.waitForSync()
        const _data = await userState.getData()
        for (let x = 0; x < fieldCount; x++) {
            if (x < sumFieldCount) {
                expect(_data[x].toString()).to.equal(data[x].toString())
            } else {
                expect(_data[x].toString()).to.equal(
                    (
                        BigInt(data[x]) <<
                        BigInt(userState.sync.settings.replNonceBits)
                    ).toString()
                )
            }
        }
        userState.stop()
    })
})
