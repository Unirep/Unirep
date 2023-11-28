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

    it('initialization', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepAddress,
            attesterId
        )
        const epoch = unirepState.calcCurrentEpoch()

        const config = await unirepContract.config()
        const stateTreeDepth = Number(config.stateTreeDepth)
        const stateTree = new IncrementalMerkleTree(stateTreeDepth)

        const contractStateTree = await unirepContract.attesterStateTreeRoot(
            attesterId
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
        const attesterId = await attester.getAddress()
        const config = await unirepContract.config()
        const stateTreeDepth = Number(config.stateTreeDepth)
        const stateTree = new IncrementalMerkleTree(stateTreeDepth)
        for (let i = 0; i < 3; i++) {
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

            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attesterId,
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
                await unirepContract.attesterStateTreeLeafCount(attesterId)
            expect(numLeaves).to.equal(Number(contractLeaves))

            userState.stop()
        }
    })

    it('user state transitions should update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const users = Array(5)
            .fill(null)
            .map(() => {
                return new Identity()
            })
        for (let i = 0; i < 3; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepAddress,
                users[i],
                BigInt(attesterId)
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            userState.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const config = await unirepContract.config()
        const stateTreeDepth = Number(config.stateTreeDepth)
        const stateTree = new IncrementalMerkleTree(stateTreeDepth)

        for (let i = 0; i < 3; i++) {
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
                Array(userState.sync.settings.fieldCount).fill(0),
                chainId
            )
            stateTree.insert(leaf)
            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attesterId,
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
                await unirepContract.attesterStateTreeLeafCount(attesterId)
            expect(numLeaves).to.equal(Number(contractLeaves))

            userState.stop()
        }
    })

    it('user state transitions with attestations should correctly update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const users = Array(3)
            .fill(null)
            .map(() => {
                return new Identity()
            })
        const _userState = await genUserState(
            ethers.provider,
            unirepAddress,
            new Identity(),
            BigInt(attesterId)
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
        _userState.stop()
        for (let i = 0; i < 3; i++) {
            const userState = await genUserState(
                ethers.provider,
                unirepAddress,
                users[i],
                BigInt(attesterId)
            )
            {
                await userState.waitForSync()
                // should set epoch in test environment
                const epoch = await unirepContract.attesterCurrentEpoch(
                    attesterId
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
            userState.stop()
        }

        const unirepState = await genUnirepState(
            ethers.provider,
            unirepAddress,
            BigInt(attesterId)
        )

        const fromEpoch = await unirepState.loadCurrentEpoch()

        // now commit the attetstations
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        unirepState.stop()

        const config = await unirepContract.config()
        const stateTreeDepth = Number(config.stateTreeDepth)
        const stateTree = new IncrementalMerkleTree(stateTreeDepth)

        for (let i = 0; i < 3; i++) {
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
                Array(userState.sync.settings.fieldCount)
                    .fill(null)
                    .map((_, index) => {
                        if (index === attestations[i].fieldIndex) {
                            return attestations[i].val
                        }
                        return BigInt(0)
                    }),
                chainId
            )
            stateTree.insert(leaf)
            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attesterId,
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
                await unirepContract.attesterStateTreeLeafCount(attesterId)
            expect(numLeaves).to.equal(Number(contractLeaves))

            userState.stop()
        }
    })

    it('should generate state tree after epoch transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = await attester.getAddress()
        const prevEpoch = Number(
            await unirepContract.attesterCurrentEpoch(attesterId)
        )
        const config = await unirepContract.config()
        const stateTreeDepth = Number(config.stateTreeDepth)
        const stateTree = new IncrementalMerkleTree(stateTreeDepth)

        for (let i = 0; i < 3; i++) {
            const id = new Identity()
            const userState = await genUserState(
                ethers.provider,
                unirepAddress,
                id,
                BigInt(attesterId)
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
                attesterId,
                prevEpoch,
                Array(userState.sync.settings.fieldCount).fill(0),
                chainId
            )
            stateTree.insert(leaf)
            userState.stop()
        }
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepAddress,
            attesterId
        )
        const numLeaves = await unirepState.numStateTreeLeaves(prevEpoch)
        const contractLeaves = await unirepContract.attesterStateTreeLeafCount(
            attesterId
        )
        expect(numLeaves).to.equal(Number(contractLeaves))

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])

        const newEpoch = await unirepContract.attesterCurrentEpoch(attesterId)
        expect(prevEpoch + 1).to.equal(newEpoch)

        const stateRootExists =
            await unirepContract.attesterStateTreeRootExists(
                attesterId,
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
