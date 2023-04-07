// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    genStateTreeLeaf,
    IncrementalMerkleTree,
    genEpochKey,
    stringifyBigInts,
} from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUserState, genUnirepState } from './utils'
import { BuildOrderedTree, Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const EPOCH_LENGTH = 1000

describe('User state transition', function () {
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

    it('users should perform user state transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attester2 = accounts[2]
        {
            await unirepContract
                .connect(attester2)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
            const epk = 2141
            await unirepContract
                .connect(attester2)
                .attest(epk, 0, 1, 1)
                .then((t) => t.wait())
        }
        const rootHistories = [] as any
        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)
        const users = Array(5)
            .fill(null)
            .map(() => new Identity())
        for (let i = 0; i < 5; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                users[i],
                BigInt(attester.address)
            )
            const epoch = await userState.sync.loadCurrentEpoch()
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            await unirepContract
                .connect(attester)
                .attest(userState.getEpochKeys()[0], epoch, 0, 0)
                .then((t) => t.wait())

            userState.sync.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        for (let i = 0; i < 5; i++) {
            let db
            {
                const state = await genUnirepState(
                    ethers.provider,
                    unirepContract.address,
                    attester2.address
                )
                db = state._db
                state.stop()
            }
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                users[i],
                BigInt(attester.address),
                db
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
                attester.address,
                toEpoch,
                Array(userState.sync.settings.fieldCount).fill(0)
            )
            stateTree.insert(leaf)
            rootHistories.push(stateTree.root)

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

    it('user should not receive rep if he does not transition to', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const user = new Identity()
        for (let i = 0; i < 10; i++) {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await ethers.provider.send('evm_mine', [])
        }
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            user,
            BigInt(attester.address)
        )
        {
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch: epoch.toNumber() }
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
        const newEpoch = epoch.toNumber() + 1
        const epochKey = genEpochKey(
            user.secret,
            BigInt(attester.address),
            newEpoch,
            0
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
        userState.sync.stop()
    })
})
