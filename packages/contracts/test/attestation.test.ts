// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    IncrementalMerkleTree,
    SparseMerkleTree,
    hash2,
    ZkIdentity,
    stringifyBigInts,
} from '@unirep/crypto'
import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    Circuit,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH, UpdateSparseTreeProof } from '../src'
import { deployUnirep } from '../deploy'

describe('Attestations', () => {
    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    it('should have the correct config value', async () => {
        const config = await unirepContract.config()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(
            config.numEpochKeyNoncePerEpoch
        )
        expect(EPOCH_TREE_DEPTH).equal(config.epochTreeDepth)
        expect(GLOBAL_STATE_TREE_DEPTH).equal(config.globalStateTreeDepth)
    })

    it('attester sign up', async () => {
        const accounts = await ethers.getSigners()
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    it('should fail to submit attestation with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            accounts[1].address,
            0
        )
        const epochKey = BigInt(24910)
        const oldLeaf = hash2([0, 0])
        const epochTree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.updateSparseTree,
            stringifyBigInts({
                from_root: epochRoot.toString(),
                leaf_index: epochKey,
                pos_rep: 1,
                neg_rep: 0,
                old_leaf: oldLeaf,
                leaf_elements: epochTree.createProof(epochKey),
            })
        )
        const { publicSignals, proof } = new UpdateSparseTreeProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const _proof = [...proof]
        _proof[0] = BigInt(_proof[0].toString()) + BigInt(1)
        await expect(
            unirepContract
                .connect(accounts[1])
                .submitAttestation(0, publicSignals, _proof)
        ).to.be.reverted
        const _publicSignals = [...publicSignals]
        _publicSignals[0] = BigInt(4128941)
        await expect(
            unirepContract
                .connect(accounts[1])
                .submitAttestation(0, _publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })

    it('should fail to submit attestation with wrong epoch', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            accounts[1].address,
            0
        )
        const epochKey = BigInt(24910)
        const oldLeaf = hash2([0, 0])
        const epochTree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.updateSparseTree,
            stringifyBigInts({
                from_root: epochRoot.toString(),
                leaf_index: epochKey,
                pos_rep: 1,
                neg_rep: 0,
                old_leaf: oldLeaf,
                leaf_elements: epochTree.createProof(epochKey),
            })
        )
        const { publicSignals, proof } = new UpdateSparseTreeProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract
                .connect(accounts[1])
                .submitAttestation(444444, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit attestation after epoch ends', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            accounts[1].address,
            0
        )
        const epochKey = BigInt(24910)
        const oldLeaf = hash2([0, 0])
        const epochTree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.updateSparseTree,
            stringifyBigInts({
                from_root: epochRoot.toString(),
                leaf_index: epochKey,
                pos_rep: 1,
                neg_rep: 0,
                old_leaf: oldLeaf,
                leaf_elements: epochTree.createProof(epochKey),
            })
        )
        const { publicSignals, proof } = new UpdateSparseTreeProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(accounts[1])
                .submitAttestation(0, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit from non-attester', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            accounts[1].address,
            0
        )
        const epochKey = BigInt(24910)
        const oldLeaf = hash2([0, 0])
        const epochTree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.updateSparseTree,
            stringifyBigInts({
                from_root: epochRoot.toString(),
                leaf_index: epochKey,
                pos_rep: 1,
                neg_rep: 0,
                old_leaf: oldLeaf,
                leaf_elements: epochTree.createProof(epochKey),
            })
        )
        const { publicSignals, proof } = new UpdateSparseTreeProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract
                .connect(accounts[5])
                .submitAttestation(1, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('should fail to submit with bad from epoch root', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            accounts[1].address,
            0
        )
        const epochKey = BigInt(24910)
        const oldLeaf = hash2([0, 0])
        const epochTree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        epochTree.update(BigInt(21412124), hash2([214, 12414]))
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.updateSparseTree,
            stringifyBigInts({
                from_root: epochTree.root.toString(),
                leaf_index: epochKey,
                pos_rep: 1,
                neg_rep: 0,
                old_leaf: oldLeaf,
                leaf_elements: epochTree.createProof(epochKey),
            })
        )
        const { publicSignals, proof } = new UpdateSparseTreeProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract
                .connect(accounts[1])
                .submitAttestation(1, publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochTreeRoot')
    })

    it('should submit attestation', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            accounts[1].address,
            0
        )
        const epochKey = BigInt(24910)
        const oldLeaf = hash2([0, 0])
        const posRep = 1
        const negRep = 5
        const newLeaf = hash2([1, 5])
        const epochTree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.updateSparseTree,
            stringifyBigInts({
                from_root: epochRoot.toString(),
                leaf_index: epochKey,
                pos_rep: posRep,
                neg_rep: negRep,
                old_leaf: oldLeaf,
                leaf_elements: epochTree.createProof(epochKey),
            })
        )
        const { publicSignals, proof } = new UpdateSparseTreeProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const tx = await unirepContract
            .connect(accounts[1])
            .submitAttestation(1, publicSignals, proof)
        await tx.wait()

        const newRoot = await unirepContract.attesterEpochRoot(
            accounts[1].address,
            1
        )
        epochTree.update(epochKey, newLeaf)
        expect(newRoot.toString()).to.equal(epochTree.root.toString())

        expect(tx)
            .to.emit(unirepContract, 'AttestationSubmitted')
            .withArgs(1, epochKey, accounts[1].address, posRep, negRep)
        expect(tx)
            .to.emit(unirepContract, 'EpochTreeLeaf')
            .withArgs(1, accounts[1].address, epochKey, newLeaf)
    })
})
