// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    ZkIdentity,
    genStateTreeLeaf,
    IncrementalMerkleTree,
    genRandomSalt,
} from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUnirepState, genUserState } from './utils'

const EPOCH_LENGTH = 1000

describe('State tree', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract
    let snapshot

    before(async () => {
        const accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(accounts[0])
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    beforeEach(async () => {
        snapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('initialization', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )
        const epoch = await unirepState.calcCurrentEpoch()

        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)
        const stateRootExists =
            await unirepContract.attesterStateTreeRootExists(
                attester.address,
                epoch,
                stateTree.root
            )
        expect(stateRootExists).to.be.true

        const contractStateTree = await unirepContract.attesterStateTreeRoot(
            attester.address,
            epoch
        )
        const unirepStateTree = await unirepState.genStateTree(epoch)
        expect(contractStateTree.toString()).to.equal(
            unirepStateTree.root.toString()
        )
        expect(unirepStateTree.root.toString()).to.equal(
            stateTree.root.toString()
        )

        await unirepState.stop()
    })

    it('sign up users should update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const config = await unirepContract.config()
        const stateTree = new IncrementalMerkleTree(config.stateTreeDepth)
        for (let i = 0; i < 3; i++) {
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

            const stateRootExists =
                await unirepContract.attesterStateTreeRootExists(
                    attester.address,
                    contractEpoch,
                    stateTree.root
                )
            expect(stateRootExists).to.be.true

            await userState.waitForSync()
            const unirepStateTree = await userState.genStateTree(contractEpoch)
            expect(unirepStateTree.root.toString()).to.equal(
                stateTree.root.toString()
            )

            const numLeaves = await userState.numStateTreeLeaves(
                Number(contractEpoch)
            )
            const contractLeaves =
                await unirepContract.attesterStateTreeLeafCount(
                    attester.address,
                    contractEpoch
                )
            expect(numLeaves).to.equal(contractLeaves.toNumber())

            await userState.stop()
        }
    })

    it('user state transitions should update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const users = Array(5)
            .fill(null)
            .map(() => {
                return new ZkIdentity()
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
            await userState.stop()
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
            const toEpoch = await userState.loadCurrentEpoch()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())

            const leaf = genStateTreeLeaf(
                users[i].identityNullifier,
                attester.address,
                toEpoch,
                0,
                0,
                0,
                0
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
            const unirepStateTree = await userState.genStateTree(toEpoch)
            expect(unirepStateTree.root.toString()).to.equal(
                stateTree.root.toString()
            )

            const numLeaves = await userState.numStateTreeLeaves(
                Number(toEpoch)
            )
            const contractLeaves =
                await unirepContract.attesterStateTreeLeafCount(
                    attester.address,
                    toEpoch
                )
            expect(numLeaves).to.equal(contractLeaves.toNumber())

            await userState.stop()
        }
    })

    it('user state transitions with attestations should correctly update state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const users = Array(3)
            .fill(null)
            .map(() => {
                return new ZkIdentity()
            })
        const attestations = Array(3)
            .fill(null)
            .map(() => {
                return {
                    posRep: Math.floor(Math.random() * 10),
                    negRep: Math.floor(Math.random() * 10),
                    graffiti: genRandomSalt(),
                    timestamp: 0,
                }
            })
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
                        epoch: epoch.toNumber(),
                    })

                await unirepContract
                    .connect(attester)
                    .userSignUp(publicSignals, proof)
                    .then((t) => t.wait())
            }

            const epoch = await userState.loadCurrentEpoch()
            const epochKeys = await userState.getEpochKeys(epoch)
            const [epk] = epochKeys
            // now submit the attestation from the attester
            const { timestamp } = await unirepContract
                .connect(attester)
                .submitAttestation(
                    epoch,
                    epk,
                    attestations[i].posRep,
                    attestations[i].negRep,
                    attestations[i].graffiti
                )
                .then((t) => t.wait())
                .then(({ blockNumber }) =>
                    ethers.provider.getBlock(blockNumber)
                )
            attestations[i].timestamp = timestamp
            // now commit the attetstations
            await unirepContract
                .connect(accounts[5])
                .buildHashchain(attester.address, epoch)
                .then((t) => t.wait())
            const hashchain = await unirepContract.attesterHashchain(
                attester.address,
                epoch,
                i
            )
            await userState.waitForSync()
            const { publicSignals, proof } =
                await userState.genAggregateEpochKeysProof({
                    epochKeys: hashchain.epochKeys,
                    newBalances: hashchain.epochKeyBalances,
                    hashchainIndex: hashchain.index,
                    epoch,
                })
            await unirepContract
                .connect(accounts[5])
                .processHashchain(publicSignals, proof)
                .then((t) => t.wait())
            await userState.stop()
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
            const toEpoch = await userState.loadCurrentEpoch()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())

            const leaf = genStateTreeLeaf(
                users[i].identityNullifier,
                attester.address,
                toEpoch,
                attestations[i].posRep,
                attestations[i].negRep,
                attestations[i].graffiti,
                attestations[i].timestamp
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
            const unirepStateTree = await userState.genStateTree(toEpoch)
            expect(unirepStateTree.root.toString()).to.equal(
                stateTree.root.toString()
            )

            const numLeaves = await userState.numStateTreeLeaves(
                Number(toEpoch)
            )
            const contractLeaves =
                await unirepContract.attesterStateTreeLeafCount(
                    attester.address,
                    toEpoch
                )
            expect(numLeaves).to.equal(contractLeaves.toNumber())

            await userState.stop()
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
            const id = new ZkIdentity()
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                BigInt(attester.address)
            )
            const { publicSignals, proof } = await userState.genUserSignUpProof(
                { epoch: prevEpoch.toNumber() }
            )

            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())

            const leaf = genStateTreeLeaf(
                id.identityNullifier,
                attester.address,
                prevEpoch,
                0,
                0,
                0,
                0
            )
            stateTree.insert(leaf)
            await userState.stop()
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const newEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        expect(prevEpoch.toNumber() + 1).to.equal(newEpoch.toNumber())

        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )
        const stateRootExists =
            await unirepContract.attesterStateTreeRootExists(
                attester.address,
                prevEpoch,
                stateTree.root
            )
        expect(stateRootExists).to.be.true

        const unirepStateTree = await unirepState.genStateTree(
            prevEpoch.toNumber()
        )
        expect(unirepStateTree.root.toString()).to.equal(
            stateTree.root.toString()
        )

        const numLeaves = await unirepState.numStateTreeLeaves(
            prevEpoch.toNumber()
        )
        const contractLeaves = await unirepContract.attesterStateTreeLeafCount(
            attester.address,
            prevEpoch
        )
        expect(numLeaves).to.equal(contractLeaves.toNumber())
    })
})
