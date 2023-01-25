// @ts-ignore

import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree, stringifyBigInts } from '@unirep/utils'
import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    defaultEpochTreeLeaf,
    BuildOrderedTree,
    Circuit,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import { genUnirepState } from './utils'

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
        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, 5, 1, 0, 0)
            .then((t) => t.wait())
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = [[5, 1, 0, 0, 0]]
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
        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, 5, 1, 0, 0)
            .then((t) => t.wait())
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = [
            [5, 1, 0, 0, 0],
            [4, 1, 0, 0, 0],
        ]
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
        for (let x = 0; x < EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2; x++) {
            const epochKey = BigInt(x + 1000)
            preimages.push([epochKey, 1, 0, 0, 0])
            await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, 1, 0, 0)
                .then((t) => t.wait())
        }
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(epoch, 2194124, 1, 0, 0)
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
