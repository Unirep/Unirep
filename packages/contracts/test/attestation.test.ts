// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    SparseMerkleTree,
    genRandomSalt,
    hash3,
    hash6,
} from '@unirep/utils'
import {
    Circuit,
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    defaultEpochTreeLeaf,
    AggregateEpochKeysProof,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { genAggregateEpochKeysCircuitInputs } from '@unirep/test'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

describe('Attestations', function () {
    this.timeout(120000)
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
        const { timestamp } = await tx
            .wait()
            .then(({ blockNumber }) => ethers.provider.getBlock(blockNumber))

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
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await expect(unirepContract.buildHashchain(attester.address, epoch)).to
            .be.reverted
    })

    it('should build correct hash chain with different epoch keys', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const attestations = [] as any
        const attestationsCount = 5
        const epochKeys = {} as any
        for (let i = 0; i < attestationsCount; i++) {
            let epochKey
            do {
                epochKey =
                    genRandomSalt() %
                    BigInt(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
            } while (epochKeys[epochKey])
            epochKeys[epochKey] = true
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = genRandomSalt()

            const { timestamp } = await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
                .then((t) => t.wait())
                .then(({ blockNumber }) =>
                    ethers.provider.getBlock(blockNumber)
                )

            attestations.push({
                posRep,
                negRep,
                epochKey,
                graffiti,
                timestamp,
            })
        }

        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

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
        attestations.reverse()
        const index = await unirepContract.attesterHashchainProcessedCount(
            attester.address,
            epoch
        )
        let currentHead = hash3([attester.address, epoch, index])
        for (let i = 0; i < hashchain.epochKeys.length; i++) {
            expect(attestations[i].epochKey.toString()).to.equal(
                hashchain.epochKeys[i].toString()
            )
            expect(attestations[i].posRep).to.equal(
                hashchain.epochKeyBalances[i].posRep.toNumber()
            )
            expect(attestations[i].negRep).to.equal(
                hashchain.epochKeyBalances[i].negRep.toNumber()
            )
            expect(attestations[i].graffiti.toString()).to.equal(
                hashchain.epochKeyBalances[i].graffiti.toString()
            )
            expect(attestations[i].timestamp).to.equal(
                hashchain.epochKeyBalances[i].timestamp.toNumber()
            )

            currentHead = hash6([
                currentHead,
                attestations[i].epochKey,
                attestations[i].posRep,
                attestations[i].negRep,
                attestations[i].graffiti,
                attestations[i].timestamp,
            ])
        }

        const _attesterId = await unirepContract.hashchainMapping(
            currentHead,
            0
        )
        const _epoch = await unirepContract.hashchainMapping(currentHead, 1)
        const _index = await unirepContract.hashchainMapping(currentHead, 2)
        expect(_attesterId.toString()).to.equal(
            BigInt(attester.address).toString()
        )
        expect(_epoch.toString()).to.equal(epoch.toString())
        expect(_index.toNumber()).to.equal(index)
        const count = await unirepContract.attesterHashchainTotalCount(
            attester.address,
            epoch
        )
        expect(count).to.equal(index + 1)
    })

    it('should build correct hash chain with the same epoch key', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

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

            timestamp = await unirepContract
                .connect(attester)
                .submitAttestation(
                    epoch,
                    epochKey,
                    newPosRep,
                    newNegRep,
                    newGraffiti
                )
                .then((t) => t.wait())
                .then(({ blockNumber }) =>
                    ethers.provider.getBlock(blockNumber)
                )
                .then(({ timestamp }) => {
                    return timestamp
                })

            posRep += newPosRep
            negRep += newNegRep
            graffiti = newGraffiti
        }

        await unirepContract
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

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
        expect(hashchain.epochKeys.length).to.equal(1)
        expect(hashchain.epochKeyBalances.length).to.equal(1)
        expect(hashchain.epochKeys[0].toString()).to.equal(epochKey.toString())
        expect(hashchain.epochKeyBalances[0].posRep.toNumber()).to.equal(posRep)
        expect(hashchain.epochKeyBalances[0].negRep.toNumber()).to.equal(negRep)
        expect(hashchain.epochKeyBalances[0].graffiti.toString()).to.equal(
            graffiti.toString()
        )
        expect(hashchain.epochKeyBalances[0].timestamp.toNumber()).to.equal(
            timestamp
        )
    })

    it('should build multiple hash chains with correct balances', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

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

            timestamp = await unirepContract
                .connect(attester)
                .submitAttestation(
                    epoch,
                    epochKey,
                    newPosRep,
                    newNegRep,
                    newGraffiti
                )
                .then((t) => t.wait())
                .then(({ blockNumber }) =>
                    ethers.provider.getBlock(blockNumber)
                )
                .then(({ timestamp }) => {
                    return timestamp
                })

            posRep += newPosRep
            negRep += newNegRep
            graffiti = newGraffiti

            await unirepContract
                .buildHashchain(attester.address, epoch)
                .then((t) => t.wait())

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
            expect(count.toNumber()).to.equal(i + 1)
            const hashchain = await unirepContract.attesterHashchain(
                attester.address,
                epoch,
                i
            )
            expect(hashchain.epochKeys.length).to.equal(1)
            expect(hashchain.epochKeyBalances.length).to.equal(1)
            expect(hashchain.epochKeys[0].toString()).to.equal(
                epochKey.toString()
            )
            expect(hashchain.epochKeyBalances[0].posRep.toNumber()).to.equal(
                posRep
            )
            expect(hashchain.epochKeyBalances[0].negRep.toNumber()).to.equal(
                negRep
            )
            expect(hashchain.epochKeyBalances[0].graffiti.toString()).to.equal(
                graffiti.toString()
            )
            expect(hashchain.epochKeyBalances[0].timestamp.toNumber()).to.equal(
                timestamp
            )
        }
    })

    it('should process hash chain', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epkCounts = 8
        const attestationsCount = 5
        const epochKeys = {} as any

        // submit attestations
        for (let i = 0; i < epkCounts; i++) {
            let epochKey
            do {
                epochKey =
                    genRandomSalt() %
                    BigInt(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
            } while (epochKeys[epochKey])
            epochKeys[epochKey] = true
            for (let j = 0; j < attestationsCount; j++) {
                const posRep = Math.floor(Math.random() * 10)
                const negRep = Math.floor(Math.random() * 10)
                const graffiti = genRandomSalt()

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

        const circuitInputs = genAggregateEpochKeysCircuitInputs(
            epoch,
            attester,
            hashchainIndex,
            hashchain
        )
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
    })

    it('should fail to process hash chain with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey =
            genRandomSalt() % BigInt(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            .then((t) => t.wait())

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
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey =
            genRandomSalt() % BigInt(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            .then((t) => t.wait())

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
        const wrongHashIndex = 1
        const circuitInputs = genAggregateEpochKeysCircuitInputs(
            epoch,
            attester,
            wrongHashIndex,
            hashchain
        )
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
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey =
            genRandomSalt() % BigInt(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            .then((t) => t.wait())

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
        const circuitInputs = genAggregateEpochKeysCircuitInputs(
            epoch,
            attester,
            hashchainIndex,
            hashchain
        )
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
        const attester = accounts[1]

        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        // submit attestations
        const epochKey =
            genRandomSalt() % BigInt(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
        const posRep = Math.floor(Math.random() * 10)
        const negRep = Math.floor(Math.random() * 10)
        const graffiti = genRandomSalt()

        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            .then((t) => t.wait())

        const invalidTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        invalidTree.update(BigInt(1234), genRandomSalt())

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
        const circuitInputs = genAggregateEpochKeysCircuitInputs(
            epoch,
            attester,
            hashchainIndex,
            hashchain,
            invalidTree
        )
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
