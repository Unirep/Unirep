// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    genRandomSalt,
    IncrementalMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/utils'
import {
    Circuit,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    STATE_TREE_DEPTH,
    EpochKeyProof,
    EpochKeyMultiProof,
    EpochKeyLiteProof,
    ReputationProof,
    SignupProof,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

const signupUser = async (id, unirepContract, attesterId, account) => {
    const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
    const r = await defaultProver.genProofAndPublicSignals(
        Circuit.signup,
        stringifyBigInts({
            epoch: epoch.toString(),
            identity_nullifier: id.identityNullifier,
            identity_trapdoor: id.trapdoor,
            attester_id: attesterId,
        })
    )
    const { publicSignals, proof } = new SignupProof(
        r.publicSignals,
        r.proof,
        defaultProver
    )
    const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    tree.insert(publicSignals[1])
    const leafIndex = await unirepContract.attesterStateTreeLeafCount(
        attesterId,
        epoch
    )
    await unirepContract
        .connect(account)
        .userSignUp(publicSignals, proof)
        .then((t) => t.wait())
    return { leaf: publicSignals[1], index: leafIndex.toNumber(), epoch, tree }
}

describe('Epoch key multi proof verifier', function () {
    this.timeout(300000)
    let unirepContract
    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester1 = accounts[1]
        const attester2 = accounts[2]
        await unirepContract
            .connect(attester1)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await unirepContract
            .connect(attester2)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })
    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })
        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should verify an epoch key multi proof', async () => {
        const accounts = await ethers.getSigners()
        const attester1 = accounts[1]
        const attester2 = accounts[2]
        const id = new ZkIdentity()
        const { leaf, index, epoch, tree } = await signupUser(
            id,
            unirepContract,
            attester1.address,
            attester1
        )

        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const data = 0
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const merkleProof = tree.createProof(index)
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyMulti,
                stringifyBigInts({
                    identity_nullifier: id.identityNullifier,
                    state_tree_elements: merkleProof.siblings,
                    state_tree_indexes: merkleProof.pathIndices,
                    data,
                    pos_rep: posRep,
                    neg_rep: negRep,
                    graffiti,
                    timestamp,
                    control: EpochKeyMultiProof.encodeControl(
                        {
                            epoch: epoch.toNumber(),
                            nonce,
                            attesterId: attester1.address,
                            revealNonce: 0,
                        },
                        {
                            epoch: 0,
                            nonce: 0,
                            attesterId: attester2.address,
                            revealNonce: 0,
                        }
                    ),
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKeyMulti,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof } = new EpochKeyMultiProof(
                r.publicSignals,
                r.proof
            )
            await unirepContract
                .verifyEpochKeyMultiProof(publicSignals, proof)
                .then((t) => t.wait())
        }
    })

    it('should decode epoch key multi signals', async () => {
        const accounts = await ethers.getSigners()
        const attester1 = accounts[1]
        const attester2 = accounts[2]
        const id = new ZkIdentity()
        const { leaf, index, epoch, tree } = await signupUser(
            id,
            unirepContract,
            attester1.address,
            attester1
        )
        const epoch2 = await unirepContract.attesterCurrentEpoch(
            attester2.address
        )

        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const data = 28104194
        const merkleProof = tree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyMulti,
            stringifyBigInts({
                identity_nullifier: id.identityNullifier,
                state_tree_elements: merkleProof.siblings,
                state_tree_indexes: merkleProof.pathIndices,
                data,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti,
                timestamp,
                control: EpochKeyMultiProof.encodeControl(
                    {
                        epoch: epoch.toNumber(),
                        nonce: 1,
                        attesterId: attester1.address,
                        revealNonce: 0,
                    },
                    {
                        epoch: epoch2,
                        nonce: 2,
                        attesterId: attester2.address,
                        revealNonce: 0,
                    }
                ),
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyMulti,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const proof = new EpochKeyMultiProof(r.publicSignals, r.proof)
        const [fullSignals, liteSignals] =
            await unirepContract.decodeEpochKeyMultiSignals(proof.publicSignals)
        expect(fullSignals.epochKey.toString()).to.equal(
            proof.epochKey[0].toString()
        )
        expect(fullSignals.stateTreeRoot.toString()).to.equal(
            proof.stateTreeRoot.toString()
        )
        expect(fullSignals.data.toString()).to.equal(data.toString())
        expect(fullSignals.attesterId.toString()).to.equal(
            BigInt(attester1.address).toString()
        )
        expect(fullSignals.nonce.toString()).to.equal('0')
        expect(fullSignals.revealNonce.toString()).to.equal('0')
        expect(fullSignals.epoch.toString()).to.equal(epoch.toString())

        expect(liteSignals.epochKey.toString()).to.equal(
            proof.epochKey[1].toString()
        )
        expect(liteSignals.data.toString()).to.equal(data.toString())
        expect(liteSignals.attesterId.toString()).to.equal(
            BigInt(attester2.address).toString()
        )
        expect(liteSignals.nonce.toString()).to.equal('0')
        expect(liteSignals.revealNonce.toString()).to.equal('0')
        expect(liteSignals.epoch.toString()).to.equal(epoch2.toString())

        await unirepContract
            .verifyEpochKeyMultiProof(proof.publicSignals, proof.proof)
            .then((t) => t.wait())
    })
})
