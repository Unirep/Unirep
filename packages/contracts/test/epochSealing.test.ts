// @ts-ignore

import { ethers } from 'hardhat'
import { expect } from 'chai'
import { stringifyBigInts } from '@unirep/utils'
import { BuildOrderedTree, Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import defaultConfig from '@unirep/circuits/config'

const { EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, FIELD_COUNT } = defaultConfig

describe('Epoch sealing', function () {
    this.timeout(120000)

    let unirepContract
    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(async () => {
            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

    it('should fail to seal with no attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = []
        const { circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        await expect(
            unirepContract
                .connect(accounts[5])
                .sealEpoch(epoch, attester.address, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'NoAttestations')
    })

    it('should fail to double seal', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const fieldIndex = 1
        const val = 3
        const epk = 39791313
        await unirepContract
            .connect(attester)
            .attest(epk, epoch, fieldIndex, val)
            .then((t) => t.wait())
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimage = [
            epk,
            ...Array(FIELD_COUNT)
                .fill(0)
                .map((_, i) => {
                    if (i === fieldIndex) {
                        return val
                    } else return 0
                }),
        ]
        const preimages = [preimage]
        const { circuitInputs, leaves } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        await unirepContract
            .connect(accounts[5])
            .sealEpoch(epoch, attester.address, publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepContract
                .connect(accounts[5])
                .sealEpoch(epoch, attester.address, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'DoubleSeal')
    })

    it('should fail to seal with incorrect leaves', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const fieldIndex = 1
        const val = 3
        const epk = 39791313
        await unirepContract
            .connect(attester)
            .attest(epk, epoch, fieldIndex, val)
            .then((t) => t.wait())
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimage = Array(1 + FIELD_COUNT)
            .fill(0)
            .map((_, i) => {
                if (i === 0) {
                    return epk
                } else if (i === fieldIndex) {
                    return val
                } else return 0
            })
        const wrongPreimage = Array(1 + FIELD_COUNT).fill(3)
        const preimages = [preimage, wrongPreimage]
        const { circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        await expect(
            unirepContract
                .connect(accounts[5])
                .sealEpoch(epoch, attester.address, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'IncorrectHash')
    })

    it('should seal with max attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const preimages = []
        const fieldIndex = 1
        const val = 1
        for (let x = 0; x < EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2; x++) {
            const epochKey = BigInt(x + 1000)
            preimages.push([
                epochKey,
                ...Array(FIELD_COUNT)
                    .fill(0)
                    .map((_, i) => {
                        if (i === fieldIndex) {
                            return val
                        } else return 0
                    }),
            ])
            await unirepContract
                .connect(attester)
                .attest(epochKey, epoch, 1, 1)
                .then((t) => t.wait())
        }
        await expect(
            unirepContract.connect(attester).attest(2194124, epoch, 1, 1)
        ).to.be.revertedWithCustomError(unirepContract, 'MaxAttestations')
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const { circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await unirepContract
            .connect(accounts[5])
            .sealEpoch(epoch, attester.address, publicSignals, proof)
            .then((t) => t.wait())
    })

    it('should seal with attestations to same user', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const preimages = []
        for (let x = 0; x < EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2; x++) {
            const epochKey = BigInt(x + 1000)
            const count = 3
            let totalRep = 0
            const fieldIndex = 1
            for (let y = 0; y < count; y++) {
                const amount = Math.floor(Math.random() * 10000)
                await unirepContract
                    .connect(attester)
                    .attest(epochKey, epoch, fieldIndex, amount)
                    .then((t) => t.wait())
                totalRep += amount
            }
            preimages.push([
                epochKey,
                ...Array(FIELD_COUNT)
                    .fill(0)
                    .map((_, i) => {
                        if (i === fieldIndex) {
                            return totalRep
                        } else return 0
                    }),
            ])
        }
        await expect(
            unirepContract.connect(attester).attest(2194124, epoch, 1, 1)
        ).to.be.revertedWithCustomError(unirepContract, 'MaxAttestations')
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const { circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await unirepContract
            .connect(accounts[5])
            .sealEpoch(epoch, attester.address, publicSignals, proof)
            .then((t) => t.wait())
    })

    it('should fail to seal with invalid epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = []
        const { circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        await expect(
            unirepContract
                .connect(accounts[5])
                .sealEpoch(epoch + 1, attester.address, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to seal with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = []
        const { circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        {
            const _p = [...publicSignals]
            _p[0] = 5

            await expect(
                unirepContract
                    .connect(accounts[5])
                    .sealEpoch(epoch, attester.address, _p, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
        }
        {
            const _p = [...proof]
            _p[0] = 5
            await expect(
                unirepContract
                    .connect(accounts[5])
                    .sealEpoch(epoch, attester.address, publicSignals, _p)
            ).to.be.reverted
        }
    })
})
