import { expect } from 'chai'
import { IncrementalMerkleTree, ZkIdentity, hash7 } from '@unirep/utils'
import {
    Circuit,
    EpochKeyProof,
    EpochKeyLiteProof,
    EpochKeyMultiProof,
} from '../src'

import { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '../config'

import { genProofAndVerify, genEpochKey } from './utils'

describe('Epoch key multi circuits', function () {
    this.timeout(300000)

    it('should prove multiple epoch keys', async () => {
        const attesterId1 = 10210
        const epoch1 = 120958
        const posRep = 2988
        const negRep = 987
        const graffiti = 1294129
        const timestamp = 214
        const nonce1 = 1
        const attesterId2 = 282828
        const epoch2 = 29188
        const nonce2 = 2
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = hash7([
            id.identityNullifier,
            attesterId1,
            epoch1,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        tree.insert(leaf)
        const treeProof = tree.createProof(0)
        const control = EpochKeyMultiProof.encodeControl(
            {
                epoch: epoch1,
                nonce: nonce1,
                revealNonce: 0,
                attesterId: attesterId1,
            },
            {
                epoch: epoch2,
                nonce: nonce2,
                revealNonce: 0,
                attesterId: attesterId2,
            }
        )
        const circuitInputs = {
            identity_nullifier: id.identityNullifier,
            state_tree_elements: treeProof.siblings,
            state_tree_indexes: treeProof.pathIndices,
            control,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti,
            timestamp,
            data: 22,
        }
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKeyMulti,
            circuitInputs
        )
        const proofData = new EpochKeyMultiProof(publicSignals, proof)
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        expect(proofData.epochKey[0]).to.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId1,
                epoch1,
                nonce1
            ).toString()
        )
        expect(proofData.epochKey[1]).to.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId2,
                epoch2,
                nonce2
            ).toString()
        )
        expect(proofData.control[0]).to.equal(
            (BigInt(control[0]) - BigInt(nonce1)).toString()
        )
        expect(proofData.control[1]).to.equal(
            (BigInt(control[1]) - BigInt(nonce2)).toString()
        )
        expect(proofData.epoch[0]).to.equal(epoch1.toString())
        expect(proofData.epoch[1]).to.equal(epoch2.toString())
        expect(proofData.nonce[0]).to.equal('0')
        expect(proofData.nonce[1]).to.equal('0')
        expect(proofData.revealNonce[0]).to.equal('0')
        expect(proofData.revealNonce[1]).to.equal('0')
        expect(proofData.attesterId[0]).to.equal(attesterId1.toString())
        expect(proofData.attesterId[1]).to.equal(attesterId2.toString())
        expect(proofData.data).to.equal('22')
    })
})
