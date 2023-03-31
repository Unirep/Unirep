import { expect } from 'chai'

import {
    IncrementalMerkleTree,
    ZkIdentity,
    genEpochKey,
    genStateTreeLeaf,
    genNullifier,
    genProposalId,
} from '@unirep/utils'
import {
    Circuit,
    CircuitConfig,
    PreventDoubleActionProof,
    EpochKeyLiteProof,
} from '../src'
import { defaultProver } from '../provers/defaultProver'

import {
    genProofAndVerify,
    randomData,
    genPreventDoubleActionCircuitInput,
} from './utils'

const { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } =
    CircuitConfig.default

describe('Prevent double action circuit', function () {
    this.timeout(300000)

    it('should prove epoch key membership with external nullifier', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(
                id.secretHash,
                attesterId,
                epoch,
                data
            )
            tree.insert(leaf)
            const externalNullifier = BigInt(1)
            const circuitInputs = genPreventDoubleActionCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                data,
                externalNullifier,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.preventDoubleAction,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[2]).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            const nullifier = genNullifier(
                id.identityNullifier,
                externalNullifier
            )
            expect(publicSignals[3]).to.equal(nullifier.toString())
            const identityCommitment = genProposalId(nullifier, id.trapdoor)
            expect(publicSignals[4]).to.equal(identityCommitment.toString())

            const p = new PreventDoubleActionProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    // it('should reveal nonce value', async () => {
    //     for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
    //         const attesterId = BigInt(10210)
    //         const epoch = 120958
    //         const data = randomData()
    //         const revealNonce = 1
    //         const id = new ZkIdentity()
    //         const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    //         const leaf = genStateTreeLeaf(
    //             id.secretHash,
    //             attesterId,
    //             epoch,
    //             data
    //         )
    //         tree.insert(leaf)

    //         const identityNullifier = BigInt(1)
    //         const proposalId = BigInt(1)
    //         const circuitInputs = genPreventDoubleActionCircuitInput({
    //             id,
    //             tree,
    //             leafIndex: 0,
    //             epoch,
    //             nonce,
    //             attesterId,
    //             data,
    //             revealNonce,
    //             identityNullifier,
    //             externalNullifier,
    //             idNullifier,
    //             idTrapdoor
    //         })
    //         const { isValid, publicSignals, proof } = await genProofAndVerify(
    //             Circuit.preventDoubleAction,
    //             circuitInputs
    //         )
    //         expect(isValid).to.be.true
    //         expect(publicSignals[2]).to.equal(
    //             EpochKeyLiteProof.buildControl({
    //                 attesterId,
    //                 epoch,
    //                 nonce,
    //                 revealNonce,
    //             }).toString()
    //         )
    //         expect(publicSignals[0]).to.equal(
    //             genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
    //         )
    //         expect(publicSignals[1]).to.equal(tree.root.toString())
    //         expect(publicSignals[2]).to.equal(
    //             EpochKeyLiteProof.buildControl({
    //                 attesterId,
    //                 epoch,
    //                 nonce,
    //                 revealNonce,
    //             }).toString()
    //         )
    //         const p = new PreventDoubleActionProof(publicSignals, proof)
    //         expect(p.epoch.toString()).to.equal(epoch.toString())
    //         expect(p.nonce.toString()).to.equal(nonce.toString())
    //         expect(p.revealNonce.toString()).to.equal(revealNonce.toString())
    //         expect(p.attesterId.toString()).to.equal(attesterId.toString())

    //         const externalNullifier = genNullifier(
    //             identityNullifier,
    //             proposalId
    //         )
    //         expect(publicSignals[3]).to.equal(externalNullifier.toString())
    //     }
    // })

    // it('should prove a data value', async () => {
    //     for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
    //         const attesterId = BigInt(10210)
    //         const epoch = 120958
    //         const data = randomData()
    //         const sigData = BigInt(1288972090)
    //         const id = new ZkIdentity()
    //         const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    //         const leaf = genStateTreeLeaf(
    //             id.secretHash,
    //             attesterId,
    //             epoch,
    //             data
    //         )
    //         tree.insert(leaf)
    //         const identityNullifier = BigInt(1)
    //         const proposalId = BigInt(1)
    //         const circuitInputs = genPreventDoubleActionCircuitInput({
    //             id,
    //             tree,
    //             leafIndex: 0,
    //             epoch,
    //             nonce,
    //             attesterId,
    //             sigData,
    //             data,
    //             identityNullifier,
    //             proposalId,
    //         })
    //         const { isValid, publicSignals, proof } = await genProofAndVerify(
    //             Circuit.preventDoubleAction,
    //             circuitInputs
    //         )
    //         expect(isValid).to.be.true
    //         expect(publicSignals[2]).to.equal(
    //             EpochKeyLiteProof.buildControl({
    //                 attesterId,
    //                 epoch,
    //                 nonce,
    //             }).toString()
    //         )
    //         expect(publicSignals[0]).to.equal(
    //             genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
    //         )
    //         expect(publicSignals[1]).to.equal(tree.root.toString())
    //         expect(publicSignals[4].toString()).to.equal(sigData.toString())
    //         const p = new PreventDoubleActionProof(publicSignals, proof)
    //         expect(p.epoch.toString()).to.equal(epoch.toString())
    //         expect(p.nonce.toString()).to.equal('0')
    //         expect(p.revealNonce.toString()).to.equal('0')
    //         expect(p.attesterId.toString()).to.equal(attesterId.toString())

    //         const externalNullifier = genNullifier(
    //             identityNullifier,
    //             proposalId
    //         )
    //         expect(publicSignals[3]).to.equal(externalNullifier.toString())
    //     }
    // })

    // it('data value should be verified in proof', async () => {
    //     for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
    //         const attesterId = BigInt(10210)
    //         const epoch = 120958
    //         const data = randomData()
    //         const sigData = BigInt(1288972090)
    //         const id = new ZkIdentity()
    //         const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    //         const leaf = genStateTreeLeaf(
    //             id.secretHash,
    //             attesterId,
    //             epoch,
    //             data
    //         )
    //         tree.insert(leaf)
    //         const identityNullifier = BigInt(1)
    //         const proposalId = BigInt(1)
    //         const circuitInputs = genPreventDoubleActionCircuitInput({
    //             id,
    //             tree,
    //             leafIndex: 0,
    //             epoch,
    //             nonce,
    //             attesterId,
    //             data,
    //             sigData,
    //             identityNullifier,
    //             proposalId,
    //         })
    //         const { isValid, publicSignals, proof } = await genProofAndVerify(
    //             Circuit.preventDoubleAction,
    //             circuitInputs
    //         )
    //         expect(isValid).to.be.true
    //         expect(publicSignals[0]).to.equal(
    //             genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
    //         )
    //         expect(publicSignals[1]).to.equal(tree.root.toString())
    //         expect(publicSignals[4].toString()).to.equal(sigData.toString())
    //         const externalNullifier = genNullifier(
    //             identityNullifier,
    //             proposalId
    //         )
    //         expect(publicSignals[3]).to.equal(externalNullifier.toString())

    //         publicSignals[3] = '00000'
    //         const valid = await defaultProver.verifyProof(
    //             Circuit.preventDoubleAction,
    //             publicSignals,
    //             proof
    //         )
    //         expect(valid).to.be.false
    //     }
    // })

    // it('should prove wrong gst root for wrong rep', async () => {
    //     const attesterId = BigInt(10210)
    //     const epoch = 120958
    //     const data = randomData()
    //     const nonce = 0
    //     const id = new ZkIdentity()
    //     const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    //     const leaf = genStateTreeLeaf(id.secretHash, attesterId, epoch, data)
    //     tree.insert(leaf)
    //     const identityNullifier = BigInt(1)
    //     const proposalId = BigInt(1)

    //     const circuitInputs = genPreventDoubleActionCircuitInput({
    //         id,
    //         tree,
    //         leafIndex: 0,
    //         epoch,
    //         nonce,
    //         attesterId,
    //         data,
    //         identityNullifier,
    //         proposalId,
    //     })
    //     circuitInputs.data[0] = 21908
    //     const { isValid, publicSignals } = await genProofAndVerify(
    //         Circuit.preventDoubleAction,
    //         circuitInputs
    //     )
    //     expect(isValid).to.be.true
    //     expect(publicSignals[0]).to.equal(
    //         genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
    //     )
    //     expect(publicSignals[1]).to.not.equal(tree.root.toString())
    //     const externalNullifier = genNullifier(identityNullifier, proposalId)
    //     expect(publicSignals[3]).to.equal(externalNullifier.toString())
    // })

    // it('should prove wrong gst root/epoch key for wrong attester id', async () => {
    //     const attesterId = BigInt(10210)
    //     const epoch = 120958
    //     const data = randomData()
    //     const nonce = 0
    //     const id = new ZkIdentity()
    //     const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    //     const leaf = genStateTreeLeaf(id.secretHash, attesterId, epoch, data)
    //     tree.insert(leaf)
    //     const identityNullifier = BigInt(1)
    //     const proposalId = BigInt(1)
    //     const circuitInputs = genPreventDoubleActionCircuitInput({
    //         id,
    //         tree,
    //         leafIndex: 0,
    //         epoch,
    //         nonce,
    //         attesterId,
    //         data,
    //         identityNullifier,
    //         proposalId,
    //     })

    //     circuitInputs.attester_id = 2171828
    //     const { isValid, publicSignals } = await genProofAndVerify(
    //         Circuit.preventDoubleAction,
    //         circuitInputs
    //     )
    //     expect(isValid).to.be.true

    //     expect(publicSignals[0]).to.not.equal(
    //         genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
    //     )
    //     expect(publicSignals[1]).to.not.equal(tree.root.toString())
    //     const externalNullifier = genNullifier(identityNullifier, proposalId)
    //     expect(publicSignals[3]).to.equal(externalNullifier.toString())
    // })
})
