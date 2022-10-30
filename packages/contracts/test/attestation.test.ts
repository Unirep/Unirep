// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'

import { AggregateEpochKeysProof, EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import {
    genRandomSalt,
    hash3,
    hash4,
    hash6,
    SparseMerkleTree,
} from '@unirep/crypto'
import {
    AGGREGATE_KEY_COUNT,
    Circuit,
    EPOCH_TREE_DEPTH,
} from '@unirep/circuits'
import { defaultEpochTreeLeaf } from '@unirep/circuits/test/utils'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

describe('Attestations', function () {
    this.timeout(120000)
    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    it('attester sign up', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    it('should fail to submit attestation with wrong epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const wrongEpoch = 444444
        const epochKey = BigInt(24910)
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(wrongEpoch, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit attestation with invalid epoch key', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = 0
        const invalidEpochKey = genRandomSalt()
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(epoch, invalidEpochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochKey')
    })

    it('should fail to submit attestation after epoch ends', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const oldEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const newEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        expect(oldEpoch.toString()).not.equal(newEpoch.toString())

        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(oldEpoch, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit from non-attester', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const wrongAttester = accounts[5]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)

        await expect(
            unirepContract
                .connect(wrongAttester)
                .submitAttestation(epoch, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('should submit attestation with graffiti', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)
        const posRep = 1
        const negRep = 5
        const graffiti = 101910
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
        await tx.wait()
        const blockNumber = await ethers.provider.getBlockNumber()
        const block = await ethers.provider.getBlock(blockNumber)
        const { timestamp } = block

        expect(tx)
            .to.emit(unirepContract, 'AttestationSubmitted')
            .withArgs(
                epoch,
                epochKey,
                attester.address,
                posRep,
                negRep,
                graffiti,
                timestamp
            )
    })

    it('should submit attestation without graffiti', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)
        const posRep = 1
        const negRep = 5
        const graffiti = 0
        const timestamp = 0

        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
        await tx.wait()

        expect(tx)
            .to.emit(unirepContract, 'AttestationSubmitted')
            .withArgs(
                epoch,
                epochKey,
                attester.address,
                posRep,
                negRep,
                graffiti,
                timestamp
            )
    })

    it('should fail to build hashchain without attestation', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[2]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await expect(unirepContract.buildHashchain(attester.address, epoch)).to
            .be.reverted
    })

    it('should build correct hash chain with different epoch keys', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[2]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        for (let i = 0; i < 5; i++) {
            const epochKey = genRandomSalt() % BigInt(2 ** EPOCH_TREE_DEPTH)
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = genRandomSalt()
            let timestamp
            {
                const tx = await unirepContract
                    .connect(attester)
                    .submitAttestation(
                        epoch,
                        epochKey,
                        posRep,
                        negRep,
                        graffiti
                    )
                const receipt = await tx.wait()
                const block = await ethers.provider.getBlock(
                    receipt.blockNumber
                )
                timestamp = block.timestamp
            }

            {
                const tx = await unirepContract.buildHashchain(
                    attester.address,
                    epoch
                )
                await tx.wait()
            }

            const currentHead = hash3([attester.address, epoch, i])
            const head = hash6([
                currentHead,
                epochKey,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
            const _attesterId = await unirepContract.hashchainMapping(head, 0)
            const _epoch = await unirepContract.hashchainMapping(head, 1)
            const _index = await unirepContract.hashchainMapping(head, 2)
            expect(_attesterId.toString()).to.equal(
                BigInt(attester.address).toString()
            )
            expect(_epoch.toString()).to.equal(epoch.toString())
            expect(_index.toNumber()).to.equal(i)
            const count = await unirepContract.attesterHashchainTotalCount(
                attester.address,
                epoch
            )
            expect(count).to.equal(i + 1)
        }
    })

    it('should build correct hash chain with the same epoch key', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[3]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        const epochKey = BigInt(12345)
        let posRep = 0
        let negRep = 0
        let graffiti = BigInt(0)
        let timestamp
        for (let i = 0; i < 5; i++) {
            const newPosRep = Math.floor(Math.random() * 10)
            const newNegRep = Math.floor(Math.random() * 10)
            const newGraffiti = genRandomSalt()

            {
                const tx = await unirepContract
                    .connect(attester)
                    .submitAttestation(
                        epoch,
                        epochKey,
                        newPosRep,
                        newNegRep,
                        newGraffiti
                    )
                const receipt = await tx.wait()
                const block = await ethers.provider.getBlock(
                    receipt.blockNumber
                )
                timestamp = block.timestamp
            }

            posRep += newPosRep
            negRep += newNegRep
            graffiti = newGraffiti
        }

        {
            const tx = await unirepContract.buildHashchain(
                attester.address,
                epoch
            )
            await tx.wait()
        }

        const currentHead = hash3([attester.address, epoch, 0])
        const head = hash6([
            currentHead,
            epochKey,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        const _attesterId = await unirepContract.hashchainMapping(head, 0)
        const _epoch = await unirepContract.hashchainMapping(head, 1)
        const _index = await unirepContract.hashchainMapping(head, 2)
        expect(_attesterId.toString()).to.equal(
            BigInt(attester.address).toString()
        )
        expect(_epoch.toString()).to.equal(epoch.toString())
        expect(_index.toNumber()).to.equal(0)
        const count = await unirepContract.attesterHashchainTotalCount(
            attester.address,
            epoch
        )
        expect(count).to.equal(1)
    })

    it('should process hash chain with different epoch keys', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[4]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        const startRoot = tree.root
        const newLeaves = Array(AGGREGATE_KEY_COUNT)
            .fill(null)
            .map((_, i) => ({
                posRep: 0,
                negRep: 0,
                leafIndex: BigInt(0),
                graffiti: BigInt(0),
                timestamp: BigInt(0),
            }))
        const attestationsCount = 5

        // submit attestations
        for (let i = 0; i < attestationsCount; i++) {
            const epochKey = genRandomSalt() % BigInt(2 ** EPOCH_TREE_DEPTH)
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = genRandomSalt()

            {
                await unirepContract
                    .connect(attester)
                    .submitAttestation(
                        epoch,
                        epochKey,
                        posRep,
                        negRep,
                        graffiti
                    )
                    .then((t) => t.wait())
            }
        }

        // build hash chain
        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        // generate hashchain proof
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        const dummyEpochKeys = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeys.length
        )
            .fill(null)
            .map(() => '0x0000000')
        const dummyBalances = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeyBalances.length
        )
            .fill(null)
            .map(() => [0, 0, 0, 0])
        const allEpochKeys = [hashchain.epochKeys, dummyEpochKeys].flat()
        const allBalances = [
            hashchain.epochKeyBalances.map(
                ({ posRep, negRep, graffiti, timestamp }) => {
                    return [
                        posRep.toString(),
                        negRep.toString(),
                        graffiti.toString(),
                        timestamp.toString(),
                    ]
                }
            ),
            dummyBalances,
        ].flat()
        const circuitInputs = {
            start_root: startRoot,
            epoch_keys: allEpochKeys.map((k) => k.toString()),
            epoch_key_balances: allBalances,
            old_epoch_key_hashes: newLeaves.map(() => defaultEpochTreeLeaf),
            path_elements: allEpochKeys.map((key, i) => {
                const p = tree.createProof(BigInt(key))
                if (i < hashchain.epochKeys.length) {
                    const { posRep, negRep, graffiti, timestamp } =
                        hashchain.epochKeyBalances[i]
                    tree.update(
                        BigInt(key),
                        hash4([posRep, negRep, graffiti, timestamp])
                    )
                }
                return p
            }),
            epoch: epoch.toString(),
            attester_id: attester.address,
            hashchain_index: hashchainIndex.toString(),
            epoch_key_count: hashchain.epochKeys.length, // process epoch keys with attestations
        }
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.aggregateEpochKeys,
            circuitInputs
        )
        const isValid = await defaultProver.verifyProof(
            Circuit.aggregateEpochKeys,
            r.publicSignals,
            r.proof
        )
        expect(isValid).to.be.true

        const { publicSignals, proof } = new AggregateEpochKeysProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const tx = await unirepContract.processHashchain(publicSignals, proof)
        await tx.wait()
    })

    it('should process hash chain with the same epoch key', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[5]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        const startRoot = tree.root
        const newLeaves = Array(AGGREGATE_KEY_COUNT)
            .fill(null)
            .map((_, i) => ({
                posRep: 0,
                negRep: 0,
                leafIndex: BigInt(0),
                graffiti: BigInt(0),
                timestamp: BigInt(0),
            }))
        const attestationsCount = 5
        const epochKey = BigInt(1234)

        // submit attestations
        for (let i = 0; i < attestationsCount; i++) {
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = genRandomSalt()

            {
                await unirepContract
                    .connect(attester)
                    .submitAttestation(
                        epoch,
                        epochKey,
                        posRep,
                        negRep,
                        graffiti
                    )
                    .then((t) => t.wait())
            }
        }

        // build hash chain
        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        // generate hashchain proof
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        const dummyEpochKeys = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeys.length
        )
            .fill(null)
            .map(() => '0x0000000')
        const dummyBalances = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeyBalances.length
        )
            .fill(null)
            .map(() => [0, 0, 0, 0])
        const allEpochKeys = [hashchain.epochKeys, dummyEpochKeys].flat()
        const allBalances = [
            hashchain.epochKeyBalances.map(
                ({ posRep, negRep, graffiti, timestamp }) => {
                    return [
                        posRep.toString(),
                        negRep.toString(),
                        graffiti.toString(),
                        timestamp.toString(),
                    ]
                }
            ),
            dummyBalances,
        ].flat()
        const circuitInputs = {
            start_root: startRoot,
            epoch_keys: allEpochKeys.map((k) => k.toString()),
            epoch_key_balances: allBalances,
            old_epoch_key_hashes: newLeaves.map(() => defaultEpochTreeLeaf),
            path_elements: allEpochKeys.map((key, i) => {
                const p = tree.createProof(BigInt(key))
                if (i < hashchain.epochKeys.length) {
                    const { posRep, negRep, graffiti, timestamp } =
                        hashchain.epochKeyBalances[i]
                    tree.update(
                        BigInt(key),
                        hash4([posRep, negRep, graffiti, timestamp])
                    )
                }
                return p
            }),
            epoch: epoch.toString(),
            attester_id: attester.address,
            hashchain_index: hashchainIndex.toString(),
            epoch_key_count: hashchain.epochKeys.length, // process epoch keys with attestations
        }
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.aggregateEpochKeys,
            circuitInputs
        )
        const isValid = await defaultProver.verifyProof(
            Circuit.aggregateEpochKeys,
            r.publicSignals,
            r.proof
        )
        expect(isValid).to.be.true

        const { publicSignals, proof } = new AggregateEpochKeysProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const tx = await unirepContract.processHashchain(publicSignals, proof)
        await tx.wait()
    })

    it('should fail to process hash chain with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[6]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey = genRandomSalt() % BigInt(2 ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        {
            await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
                .then((t) => t.wait())
        }

        // build hash chain
        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        // generate hashchain proof
        const publicSignals = Array(10).fill(0)
        const proof = Array(8).fill(0)
        await expect(
            unirepContract.processHashchain(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })

    it('should fail to process hash chain with wrong hashchain', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[6]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey = genRandomSalt() % BigInt(2 ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        {
            await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
                .then((t) => t.wait())
        }

        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )

        // build hash chain
        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        // generate hashchain proof
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        const dummyEpochKeys = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeys.length
        )
            .fill(null)
            .map(() => '0x0000000')
        const dummyBalances = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeyBalances.length
        )
            .fill(null)
            .map(() => [0, 0, 0, 0])
        const allEpochKeys = [hashchain.epochKeys, dummyEpochKeys].flat()
        const allBalances = [
            hashchain.epochKeyBalances.map(
                ({ posRep, negRep, graffiti, timestamp }) => {
                    return [
                        posRep.toString(),
                        negRep.toString(),
                        graffiti.toString(),
                        timestamp.toString(),
                    ]
                }
            ),
            dummyBalances,
        ].flat()
        const wrongHashIndex = 1
        const circuitInputs = {
            start_root: tree.root,
            epoch_keys: allEpochKeys.map((k) => k.toString()),
            epoch_key_balances: allBalances,
            old_epoch_key_hashes:
                Array(AGGREGATE_KEY_COUNT).fill(defaultEpochTreeLeaf),
            path_elements: allEpochKeys.map((key, i) => {
                const p = tree.createProof(BigInt(key))
                if (i < hashchain.epochKeys.length) {
                    const { posRep, negRep, graffiti, timestamp } =
                        hashchain.epochKeyBalances[i]
                    tree.update(
                        BigInt(key),
                        hash4([posRep, negRep, graffiti, timestamp])
                    )
                }
                return p
            }),
            epoch: epoch.toString(),
            attester_id: attester.address,
            hashchain_index: wrongHashIndex, // make the proof valid but the hashchain doesn't exist
            epoch_key_count: hashchain.epochKeys.length, // process epoch keys with attestations
        }
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.aggregateEpochKeys,
            circuitInputs
        )
        const isValid = await defaultProver.verifyProof(
            Circuit.aggregateEpochKeys,
            r.publicSignals,
            r.proof
        )
        expect(isValid).to.be.true

        const { publicSignals, proof } = new AggregateEpochKeysProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract.processHashchain(publicSignals, proof)
        ).to.be.revertedWith('value is 0')
    })

    it('should fail to process hash chain with processed hashchain', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[6]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey = genRandomSalt() % BigInt(2 ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        {
            await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
                .then((t) => t.wait())
        }

        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )

        // build hash chain
        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        // generate hashchain proof
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        const dummyEpochKeys = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeys.length
        )
            .fill(null)
            .map(() => '0x0000000')
        const dummyBalances = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeyBalances.length
        )
            .fill(null)
            .map(() => [0, 0, 0, 0])
        const allEpochKeys = [hashchain.epochKeys, dummyEpochKeys].flat()
        const allBalances = [
            hashchain.epochKeyBalances.map(
                ({ posRep, negRep, graffiti, timestamp }) => {
                    return [
                        posRep.toString(),
                        negRep.toString(),
                        graffiti.toString(),
                        timestamp.toString(),
                    ]
                }
            ),
            dummyBalances,
        ].flat()
        const circuitInputs = {
            start_root: tree.root,
            epoch_keys: allEpochKeys.map((k) => k.toString()),
            epoch_key_balances: allBalances,
            old_epoch_key_hashes:
                Array(AGGREGATE_KEY_COUNT).fill(defaultEpochTreeLeaf),
            path_elements: allEpochKeys.map((key, i) => {
                const p = tree.createProof(BigInt(key))
                if (i < hashchain.epochKeys.length) {
                    const { posRep, negRep, graffiti, timestamp } =
                        hashchain.epochKeyBalances[i]
                    tree.update(
                        BigInt(key),
                        hash4([posRep, negRep, graffiti, timestamp])
                    )
                }
                return p
            }),
            epoch: epoch.toString(),
            attester_id: attester.address,
            hashchain_index: hashchainIndex.toString(),
            epoch_key_count: hashchain.epochKeys.length, // process epoch keys with attestations
        }
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.aggregateEpochKeys,
            circuitInputs
        )
        const isValid = await defaultProver.verifyProof(
            Circuit.aggregateEpochKeys,
            r.publicSignals,
            r.proof
        )
        expect(isValid).to.be.true

        const { publicSignals, proof } = new AggregateEpochKeysProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await unirepContract
            .processHashchain(publicSignals, proof)
            .then((t) => t.wait())

        await expect(
            unirepContract.processHashchain(publicSignals, proof)
        ).to.be.revertedWith('value is 0')
    })

    it('should fail to process hash chain with invalid epoch tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[6]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey = genRandomSalt() % BigInt(2 ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        {
            await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
                .then((t) => t.wait())
        }

        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )

        // build hash chain
        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        // generate hashchain proof
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        const dummyEpochKeys = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeys.length
        )
            .fill(null)
            .map(() => '0x0000000')
        const dummyBalances = Array(
            AGGREGATE_KEY_COUNT - hashchain.epochKeyBalances.length
        )
            .fill(null)
            .map(() => [0, 0, 0, 0])
        const allEpochKeys = [hashchain.epochKeys, dummyEpochKeys].flat()
        const allBalances = [
            hashchain.epochKeyBalances.map(
                ({ posRep, negRep, graffiti, timestamp }) => {
                    return [
                        posRep.toString(),
                        negRep.toString(),
                        graffiti.toString(),
                        timestamp.toString(),
                    ]
                }
            ),
            dummyBalances,
        ].flat()
        const circuitInputs = {
            start_root: tree.root,
            epoch_keys: allEpochKeys.map((k) => k.toString()),
            epoch_key_balances: allBalances,
            old_epoch_key_hashes:
                Array(AGGREGATE_KEY_COUNT).fill(defaultEpochTreeLeaf),
            path_elements: allEpochKeys.map((key, i) => {
                const p = tree.createProof(BigInt(key))
                if (i < hashchain.epochKeys.length) {
                    const { posRep, negRep, graffiti, timestamp } =
                        hashchain.epochKeyBalances[i]
                    tree.update(
                        BigInt(key),
                        hash4([posRep, negRep, graffiti, timestamp])
                    )
                }
                return p
            }),
            epoch: epoch.toString(),
            attester_id: attester.address,
            hashchain_index: hashchainIndex.toString(),
            epoch_key_count: hashchain.epochKeys.length, // process epoch keys with attestations
        }
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.aggregateEpochKeys,
            circuitInputs
        )
        const isValid = await defaultProver.verifyProof(
            Circuit.aggregateEpochKeys,
            r.publicSignals,
            r.proof
        )
        expect(isValid).to.be.true

        const { publicSignals, proof } = new AggregateEpochKeysProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract.processHashchain(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochTreeRoot')
    })
})
