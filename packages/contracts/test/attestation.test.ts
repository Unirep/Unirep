// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { hash4, SparseMerkleTree } from '@unirep/crypto'
import {
    AGGREGATE_KEY_COUNT,
    Circuit,
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { AggregateEpochKeysProof, EPOCH_LENGTH } from '../src'
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
        const wrongEpoch = 444444
        const epochKey = BigInt(24910)
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(wrongEpoch, epochKey, 1, 1, 0)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
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
        const wrontAttester = accounts[5]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const epochKey = BigInt(24910)

        await expect(
            unirepContract
                .connect(wrontAttester)
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
        {
            const tx = await unirepContract.buildHashchain(
                attester.address,
                epoch
            )
            await tx.wait()
        }

        {
            const tree = new SparseMerkleTree(
                EPOCH_TREE_DEPTH,
                defaultEpochTreeLeaf
            )
            const startRoot = tree.root
            const newLeaves = Array(AGGREGATE_KEY_COUNT).fill({
                posRep: BigInt(0),
                negRep: BigInt(0),
                graffiti: BigInt(0),
                timestamp: BigInt(0),
                leafIndex: BigInt(0),
            })
            newLeaves[0] = {
                posRep,
                negRep,
                graffiti,
                timestamp,
                leafIndex: epochKey,
            }
            const circuitInputs = {
                start_root: startRoot,
                epoch_keys: newLeaves.map(({ leafIndex }) => leafIndex),
                epoch_key_balances: newLeaves.map(
                    ({ posRep, negRep, graffiti, timestamp }) => [
                        posRep,
                        negRep,
                        graffiti,
                        timestamp,
                    ]
                ),
                old_epoch_key_hashes: newLeaves.map(() => defaultEpochTreeLeaf),
                path_elements: newLeaves.map((d) => {
                    const p = tree.createProof(d.leafIndex)
                    tree.update(
                        d.leafIndex,
                        hash4([d.posRep, d.negRep, d.graffiti, d.timestamp])
                    )
                    return p
                }),
                epoch: epoch.toString(),
                attester_id: attester.address,
                hashchain_index: 0,
                epoch_key_count: 1, // process all of them
            }
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.aggregateEpochKeys,
                circuitInputs
            )

            const proof = new AggregateEpochKeysProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )

            const tx = await unirepContract.processHashchain(
                proof.publicSignals,
                proof.proof
            )
            await tx.wait()
        }
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
})
