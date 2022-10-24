// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { hash4, SparseMerkleTree, ZkIdentity } from '@unirep/crypto'
import {
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

describe('Attestations', function () {
    this.timeout(120000)
    let unirepContract
    const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])

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
        expect(STATE_TREE_DEPTH).equal(config.stateTreeDepth)
        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        expect(tree.root.toString()).equal(config.emptyEpochTreeRoot.toString())
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
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            0
        )
        const epochKey = BigInt(24910)
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        const wrongEpoch = 444444
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(wrongEpoch, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit attestation after epoch ends', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            0
        )
        const epochKey = BigInt(24910)
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(0, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to submit from non-attester', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const wrongAttester = accounts[5]
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            0
        )
        const epochKey = BigInt(24910)
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf
        )
        await expect(
            unirepContract
                .connect(wrongAttester)
                .submitAttestation(1, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('should fail to attest to invalid epoch key', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epochKey = BigInt(2 ** 50)
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(1, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochKey')
    })

    it('should submit attestation with graffiti', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            0
        )
        const epochKey = BigInt(24910)
        const posRep = 1
        const negRep = 5
        const graffiti = 101910
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(1, epochKey, posRep, negRep, graffiti)
        await tx.wait()
        const blockNumber = await ethers.provider.getBlockNumber()
        const block = await ethers.provider.getBlock(blockNumber)
        const { timestamp } = block

        expect(tx)
            .to.emit(unirepContract, 'AttestationSubmitted')
            .withArgs(
                1,
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
        const id = new ZkIdentity()
        const epochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            0
        )
        const epochKey = BigInt(24910)
        const posRep = 1
        const negRep = 5
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(1, epochKey, posRep, negRep, 0)
        await tx.wait()

        expect(tx)
            .to.emit(unirepContract, 'AttestationSubmitted')
            .withArgs(1, epochKey, attester.address, posRep, negRep, 0, 0)
    })
})
