// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    genStateTreeLeaf,
    IncrementalMerkleTree,
    genEpochKey,
    genIdentityHash,
} from '@unirep/utils'
import { poseidon1 } from 'poseidon-lite'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState, genUnirepState, EPOCH_LENGTH } from './utils'

describe('User state transition', function () {
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

    it('users should perform user state transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const rootHistories = [] as any
        const config = await unirepContract.config()
        const stateTreeDepth = Number(config.stateTreeDepth)
        const fieldCount = Number(config.fieldCount)
        const sumFieldCount = Number(config.sumFieldCount)
        const replFieldBits = Number(config.replFieldBits)
        const replNonceBits = Number(config.replNonceBits)
        const stateTree = new IncrementalMerkleTree(stateTreeDepth)
        const randomData = () =>
            Array(fieldCount)
                .fill(0)
                .map((_, i) => {
                    const v = poseidon1([Math.floor(Math.random() * 199191919)])
                    if (i < sumFieldCount) {
                        return v
                    }
                    return v % BigInt(2) ** BigInt(replFieldBits)
                })
        const randomDataShifted = (da) =>
            da.map((d, i) => {
                if (i < sumFieldCount) {
                    return d
                } else {
                    return BigInt(d) << BigInt(replNonceBits)
                }
            })

        const users = Array(3)
            .fill(null)
            .map(() => new Identity())
        const fromEpoch = await unirepContract.attesterCurrentEpoch(attesterId)
        for (let i = 0; i < users.length; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepAddress,
                users[i],
                BigInt(attesterId)
            )

            const startData = randomData()
            const idHash = genIdentityHash(
                users[i].secret,
                attesterId,
                fromEpoch,
                chainId
            )
            await unirepContract
                .connect(attester)
                .manualUserSignUp(
                    fromEpoch,
                    userState.commitment,
                    idHash,
                    startData
                )
                .then((t) => t.wait())

            const data = randomData()
            for (const [i, d] of Object.entries(data)) {
                await unirepContract
                    .connect(attester)
                    .attest(
                        userState.getEpochKeys()[
                            Number(i) % Number(config.numEpochKeyNoncePerEpoch)
                        ],
                        fromEpoch,
                        i,
                        d
                    )
                    .then((t) => t.wait())
            }

            userState.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        for (let i = 0; i < users.length; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepAddress,
                users[i],
                BigInt(attesterId)
            )
            await userState.waitForSync()
            const toEpoch = await userState.sync.loadCurrentEpoch()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())

            const leaf = genStateTreeLeaf(
                users[i].secret,
                attesterId,
                toEpoch,
                await userState.getData(),
                chainId
            )
            stateTree.insert(leaf)
            rootHistories.push(stateTree.root)

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

    it('user should not receive rep if he does not transition to', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const user = new Identity()
        for (let i = 0; i < 10; i++) {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
        }
        const epoch = Number(
            await unirepContract.attesterCurrentEpoch(attesterId)
        )
        const userState = await genUserState(
            ethers.provider,
            unirepAddress,
            user,
            BigInt(attesterId)
        )
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch }
            )

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        // receive reputation
        const newEpoch = epoch + 1
        const epochKey = genEpochKey(
            user.secret,
            BigInt(attesterId),
            newEpoch,
            0,
            chainId
        )
        const fieldIndex = 0
        const val = 10
        await unirepContract
            .connect(attester)
            .attest(epochKey, newEpoch, fieldIndex, val)
            .then((t) => t.wait())

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        await userState.waitForSync()

        {
            const toEpoch = newEpoch + 1
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    toEpoch,
                })
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        await userState.waitForSync()
        const data = await userState.getData()
        expect(data[fieldIndex].toString()).to.equal('0')
        userState.stop()
    })
})
