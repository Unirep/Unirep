// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { genStateTreeLeaf, IncrementalMerkleTree } from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'

import { EPOCH_LENGTH, genUnirepState, genUserState } from './utils'

describe('State tree', function () {
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

    it('initialization', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )
        const epoch = unirepState.calcCurrentEpoch()

        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)

        const contractStateTree = await unirepContract.attesterStateTreeRoot(
            attester.address
        )
        const unirepStateTree = await unirepState.genStateTree(epoch)
        expect(contractStateTree.toString()).to.equal(
            unirepStateTree.root.toString()
        )
        expect(unirepStateTree.root.toString()).to.equal(
            stateTree.root.toString()
        )

        unirepState.stop()
    })

    it('sign up users should update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)
        for (let i = 0; i < 3; i++) {
            const id = new Identity()
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
                id.secret,
                attester.address,
                contractEpoch,
                Array(userState.sync.settings.fieldCount).fill(0)
            )

            stateTree.insert(leaf)

            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attester.address,
                    contractEpoch,
                    stateTree.root
                )
            expect(stateRootExists).to.be.true

            await userState.waitForSync()
            const unirepStateTree = await userState.sync.genStateTree(
                contractEpoch
            )
            expect(unirepStateTree.root.toString()).to.equal(
                stateTree.root.toString()
            )

            const numLeaves = await userState.sync.numStateTreeLeaves(
                Number(contractEpoch)
            )
            const contractLeaves =
                await unirepContract.attesterStateTreeLeafCount(
                    attester.address
                )
            expect(numLeaves).to.equal(contractLeaves.toNumber())

            userState.sync.stop()
        }
    })

    it('user state transitions should update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const users = Array(5)
            .fill(null)
            .map(() => {
                return new Identity()
            })
        for (let i = 0; i < 3; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                users[i],
                BigInt(attester.address)
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            userState.sync.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)

        for (let i = 0; i < 3; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                users[i],
                BigInt(attester.address)
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
            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attester.address,
                    toEpoch,
                    stateTree.root
                )
            expect(stateRootExists).to.be.true

            await userState.waitForSync()
            const unirepStateTree = await userState.sync.genStateTree(toEpoch)
            expect(unirepStateTree.root.toString()).to.equal(
                stateTree.root.toString()
            )

            const numLeaves = await userState.sync.numStateTreeLeaves(
                Number(toEpoch)
            )
            const contractLeaves =
                await unirepContract.attesterStateTreeLeafCount(
                    attester.address
                )
            expect(numLeaves).to.equal(contractLeaves.toNumber())

            userState.sync.stop()
        }
    })

    it('user state transitions with attestations should correctly update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const users = Array(3)
            .fill(null)
            .map(() => {
                return new Identity()
            })
        const _userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            new Identity(),
            BigInt(attester.address)
        )
        const attestations = Array(3)
            .fill(null)
            .map(() => {
                const fieldIndex = Math.floor(
                    Math.random() * _userState.sync.settings.sumFieldCount
                )
                const val = Math.floor(Math.random() * 10000000000000)
                return {
                    fieldIndex,
                    val,
                }
            })
        _userState.sync.stop()
        for (let i = 0; i < 3; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                users[i],
                BigInt(attester.address)
            )
            {
                await userState.waitForSync()
                // should set epoch in test environment
                const epoch = await unirepContract.attesterCurrentEpoch(
                    attester.address
                )
                const { publicSignals, proof } =
                    await userState.genUserSignUpProof({
                        epoch,
                    })

                await unirepContract
                    .connect(attester)
                    .userSignUp(publicSignals, proof)
                    .then((t) => t.wait())
            }

            const epoch = await userState.sync.loadCurrentEpoch()
            const epochKeys = userState.getEpochKeys(epoch) as bigint[]
            const [epk] = epochKeys
            // now submit the attestation from the attester
            await unirepContract
                .connect(attester)
                .attest(
                    epk,
                    epoch,
                    attestations[i].fieldIndex,
                    attestations[i].val
                )
                .then((t) => t.wait())
            userState.sync.stop()
        }

        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            BigInt(attester.address)
        )

        const fromEpoch = await unirepState.loadCurrentEpoch()

        // now commit the attetstations
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        unirepState.stop()

        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)

        for (let i = 0; i < 3; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                users[i],
                BigInt(attester.address)
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
                Array(userState.sync.settings.fieldCount)
                    .fill(null)
                    .map((_, index) => {
                        if (index === attestations[i].fieldIndex) {
                            return attestations[i].val
                        }
                        return BigInt(0)
                    })
            )
            stateTree.insert(leaf)
            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attester.address,
                    toEpoch,
                    stateTree.root
                )
            expect(stateRootExists).to.be.true

            await userState.waitForSync()
            const unirepStateTree = await userState.sync.genStateTree(toEpoch)
            expect(unirepStateTree.root.toString()).to.equal(
                stateTree.root.toString()
            )

            const numLeaves = await userState.sync.numStateTreeLeaves(
                Number(toEpoch)
            )
            const contractLeaves =
                await unirepContract.attesterStateTreeLeafCount(
                    attester.address
                )
            expect(numLeaves).to.equal(contractLeaves.toNumber())

            userState.sync.stop()
        }
    })

    it('should generate state tree after epoch transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const prevEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)

        for (let i = 0; i < 3; i++) {
            const id = new Identity()
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                BigInt(attester.address)
            )
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch: prevEpoch }
            )

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            const leaf = genStateTreeLeaf(
                id.secret,
                attester.address,
                prevEpoch,
                Array(userState.sync.settings.fieldCount).fill(0)
            )
            stateTree.insert(leaf)
            userState.sync.stop()
        }
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )
        const numLeaves = await unirepState.numStateTreeLeaves(prevEpoch)
        const contractLeaves = await unirepContract.attesterStateTreeLeafCount(
            attester.address
        )
        expect(numLeaves).to.equal(contractLeaves.toNumber())

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        const newEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        expect(prevEpoch + 1).to.equal(newEpoch)

        const stateRootExists =
            await unirepContract.attesterStateTreeRootExists(
                attester.address,
                prevEpoch,
                stateTree.root
            )
        expect(stateRootExists).to.be.true

        const unirepStateTree = await unirepState.genStateTree(prevEpoch)
        expect(unirepStateTree.root.toString()).to.equal(
            stateTree.root.toString()
        )
    })
})
