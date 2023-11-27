// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { F, IncrementalMerkleTree, stringifyBigInts } from '@unirep/utils'
import {
    Circuit,
    EpochKeyProof,
    EpochKeyLiteProof,
    SignupProof,
    CircuitConfig,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { deployUnirep, deployVerifierHelper } from '../deploy'
import { EPOCH_LENGTH } from './config'
const { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT } =
    CircuitConfig.default

const epoch = 0
const id = new Identity()
let chainId
let attester

describe('Epoch key verifier helper', function () {
    this.timeout(500000)

    let unirepContract
    let epochKeyVerifierHelper
    let signupProof: SignupProof
    const data = 234333
    let circuitInputs = {
        state_tree_elements: [0],
        state_tree_indices: [0],
        identity_secret: id.secret,
        data: Array(FIELD_COUNT).fill(0),
        sig_data: data,
        epoch,
        nonce: 0,
        attester_id: 0,
        reveal_nonce: 0,
        chain_id: 0,
    }

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const unirepAddress = await unirepContract.getAddress()
        epochKeyVerifierHelper = await deployVerifierHelper(
            unirepAddress,
            accounts[0],
            Circuit.epochKey
        )
        attester = accounts[1]
        const attesterId = await attester.getAddress()
        const network = await attester.provider.getNetwork()
        chainId = network.chainId

        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch: epoch,
                identity_secret: id.secret,
                attester_id: attesterId,
                chain_id: chainId,
            })
        )
        signupProof = new SignupProof(r.publicSignals, r.proof, defaultProver)

        const index = 0
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(signupProof.stateTreeLeaf)

        const merkleProof = stateTree.createProof(index)
        circuitInputs = {
            ...circuitInputs,
            state_tree_elements: merkleProof.siblings,
            state_tree_indices: merkleProof.pathIndices,
            attester_id: attesterId,
            chain_id: chainId,
        }
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())

            const { publicSignals, proof } = signupProof
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should verify an epoch key proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKey,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof } = new EpochKeyProof(
                r.publicSignals,
                r.proof
            )
            await epochKeyVerifierHelper.verifyAndCheck(publicSignals, proof)
        }
    })

    it('should decode public signals', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const revealNonce = 1
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                    reveal_nonce: revealNonce,
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKey,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const proof = new EpochKeyProof(r.publicSignals, r.proof)
            const signals = await epochKeyVerifierHelper.decodeEpochKeySignals(
                proof.publicSignals
            )
            expect(signals.epochKey.toString()).to.equal(
                proof.epochKey.toString()
            )
            expect(signals.stateTreeRoot.toString()).to.equal(
                proof.stateTreeRoot.toString()
            )
            expect(signals.nonce.toString()).to.equal(proof.nonce.toString())
            expect(signals.epoch.toString()).to.equal(proof.epoch.toString())
            expect(signals.revealNonce).to.equal(Boolean(revealNonce))
            expect(signals.attesterId.toString()).to.equal(
                proof.attesterId.toString()
            )
            expect(signals.chainId.toString()).to.equal(
                proof.chainId.toString()
            )
            expect(signals.data.toString()).to.equal(proof.data.toString())
        }
    })

    it('should fail to verify an epoch key proof with invalid epoch key', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts(circuitInputs)
        )
        const v = await defaultProver.verifyProof(
            Circuit.epochKey,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof, idx } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[idx.epochKey] = F
            await expect(
                epochKeyVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyVerifierHelper,
                'InvalidEpochKey'
            )
        }
    })

    it('should fail to verify an epoch key proof with invalid epoch', async () => {
        const invalidEpoch = epoch + 2
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts({
                ...circuitInputs,
                epoch: invalidEpoch,
            })
        )
        const v = await defaultProver.verifyProof(
            Circuit.epochKey,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )
        await expect(
            epochKeyVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(epochKeyVerifierHelper, 'InvalidEpoch')
    })

    it('should fail to verify an epoch key proof with invalid state tree', async () => {
        // invalid chain id will be reverted here
        const invalidChainId = 123
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: invalidChainId,
            })
        )
        const v = await defaultProver.verifyProof(
            Circuit.epochKey,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )
        await expect(
            epochKeyVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(
            epochKeyVerifierHelper,
            'InvalidStateTreeRoot'
        )
    })

    it('should fail to verify an epoch key proof with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts(circuitInputs)
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKey,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )
        {
            const _proof = [...proof].map((x) => BigInt(x))
            _proof[0] = BigInt(proof[0]) + BigInt(1)
            await expect(
                epochKeyVerifierHelper.verifyAndCheck(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = BigInt(publicSignals[0]) + BigInt(1)
            await expect(
                epochKeyVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyVerifierHelper,
                'InvalidProof'
            )
        }
    })

    it('verify that msg.sender is the same as attesterId', async () => {
        const accounts = await ethers.getSigners()
        const randomAttester = accounts[0]
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts(circuitInputs)
            )

            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                epochKeyVerifierHelper
                    .connect(attester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.not.be.reverted
        }
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts(circuitInputs)
            )
            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                epochKeyVerifierHelper
                    .connect(randomAttester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyVerifierHelper,
                'CallerInvalid'
            )
        }
    })
})
