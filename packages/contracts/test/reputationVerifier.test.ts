// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    F,
    genIdentityHash,
    genRandomSalt,
    genStateTreeLeaf,
    IncrementalMerkleTree,
    stringifyBigInts,
} from '@unirep/utils'
import {
    Circuit,
    EpochKeyLiteProof,
    ReputationProof,
    CircuitConfig,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { deployUnirep, deployVerifierHelper } from '../deploy'
import { EPOCH_LENGTH } from './config'
const {
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    REPL_NONCE_BITS,
    ATTESTER_ID_BITS,
    EPOCH_BITS,
    NONCE_BITS,
    REP_BITS,
} = CircuitConfig.default

function randomBits(bit: number) {
    return genRandomSalt() % (BigInt(2) ** BigInt(bit) - BigInt(1))
}

const epoch = 0
const id = new Identity()
let chainId
let attester

describe('Reputation verifier helper', function () {
    this.timeout(120000)

    const sigData = 696969
    const graffiti = BigInt(234524)
    const signupData = [0, 0, 0, 0, BigInt(graffiti), 0]
    const data = [0, 0, 0, 0, BigInt(graffiti) << BigInt(REPL_NONCE_BITS), 0]
    let circuitInputs = {
        identity_secret: id.secret,
        state_tree_indices: [0],
        state_tree_elements: [0],
        data,
        prove_graffiti: 1,
        graffiti,
        reveal_nonce: false,
        attester_id: 0,
        epoch,
        nonce: 0,
        min_rep: 0,
        max_rep: 0,
        prove_min_rep: 0,
        prove_max_rep: 0,
        prove_zero_rep: 0,
        sig_data: sigData,
        chain_id: 0,
    }

    let unirepContract
    let repVerifierHelper
    let idHash

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const unirepAddress = await unirepContract.getAddress()
        repVerifierHelper = await deployVerifierHelper(
            unirepAddress,
            accounts[0],
            Circuit.reputation
        )
        attester = accounts[1]
        const attesterId = await attester.getAddress()
        const network = await attester.provider.getNetwork()
        chainId = network.chainId

        const leaf = genStateTreeLeaf(
            id.secret,
            attesterId,
            epoch,
            data,
            chainId
        )

        idHash = genIdentityHash(id.secret, attesterId, epoch, chainId)

        const index = 0
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

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

            await unirepContract
                .connect(attester)
                .manualUserSignUp(epoch, id.commitment, idHash, signupData)
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should verify a reputation proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.reputation,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                })
            )
            const v = await defaultProver.verifyProof(
                Circuit.reputation,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof, ...proofFields } =
                new ReputationProof(r.publicSignals, r.proof)
            const signals = await repVerifierHelper.verifyAndCheck(
                publicSignals,
                proof
            )
            expect(signals.epochKey.toString()).to.equal(
                proofFields.epochKey.toString()
            )
            expect(signals.stateTreeRoot.toString()).to.equal(
                proofFields.stateTreeRoot.toString()
            )
            expect(signals.nonce.toString()).to.equal(
                proofFields.nonce.toString()
            )
            expect(signals.epoch.toString()).to.equal(
                proofFields.epoch.toString()
            )
            expect(signals.attesterId.toString()).to.equal(
                proofFields.attesterId.toString()
            )
            expect(signals.revealNonce).to.equal(
                Boolean(proofFields.revealNonce)
            )
            expect(signals.chainId.toString()).to.equal(
                proofFields.chainId.toString()
            )
            expect(signals.minRep.toString()).to.equal(
                proofFields.minRep.toString()
            )
            expect(signals.maxRep.toString()).to.equal(
                proofFields.maxRep.toString()
            )
            expect(signals.proveMinRep).to.equal(
                Boolean(proofFields.proveMinRep)
            )
            expect(signals.proveMaxRep).to.equal(
                Boolean(proofFields.proveMaxRep)
            )
            expect(signals.proveZeroRep).to.equal(
                Boolean(proofFields.proveZeroRep)
            )
            expect(signals.proveGraffiti).to.equal(
                Boolean(proofFields.proveGraffiti)
            )
            expect(signals.graffiti.toString()).to.equal(
                proofFields.graffiti.toString()
            )
            expect(signals.data.toString()).to.equal(
                proofFields.data.toString()
            )
        }
    })

    it('should decode public signals', async () => {
        const epoch = randomBits(Number(EPOCH_BITS))
        const nonce = randomBits(Number(NONCE_BITS))
        const attesterId = randomBits(Number(ATTESTER_ID_BITS))
        const revealNonce = false

        for (let proveMinRep = 0; proveMinRep < 2; proveMinRep++) {
            for (let proveMaxRep = 0; proveMaxRep < 2; proveMaxRep++) {
                for (let proveZeroRep = 0; proveZeroRep < 2; proveZeroRep++) {
                    for (
                        let proveGraffiti = 0;
                        proveGraffiti < 2;
                        proveGraffiti++
                    ) {
                        const maxRep = randomBits(Number(REP_BITS))
                        const minRep = randomBits(Number(REP_BITS))
                        const control = ReputationProof.buildControl({
                            attesterId,
                            epoch,
                            nonce,
                            revealNonce,
                            proveGraffiti,
                            minRep,
                            maxRep,
                            proveMinRep,
                            proveMaxRep,
                            proveZeroRep,
                            chainId,
                        })
                        const decodedControl =
                            await repVerifierHelper.decodeReputationControl(
                                control[1]
                            )
                        expect(decodedControl.minRep.toString()).to.equal(
                            minRep.toString()
                        )
                        expect(decodedControl.maxRep.toString()).to.equal(
                            maxRep.toString()
                        )
                        expect(decodedControl.proveMinRep).to.equal(
                            Boolean(proveMinRep)
                        )
                        expect(decodedControl.proveMaxRep).to.equal(
                            Boolean(proveMaxRep)
                        )
                        expect(decodedControl.proveZeroRep).to.equal(
                            Boolean(proveZeroRep)
                        )
                        expect(decodedControl.proveGraffiti).to.equal(
                            Boolean(proveGraffiti)
                        )
                    }
                }
            }
        }
    })

    it('should fail to verify a reputation proof with invalid epoch key', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts(circuitInputs)
        )

        const v = await defaultProver.verifyProof(
            Circuit.reputation,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof, idx } = new ReputationProof(
            r.publicSignals,
            r.proof
        )

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[idx.epochKey] = F
            await expect(
                repVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                repVerifierHelper,
                'InvalidEpochKey'
            )
        }
    })

    it('should fail to verify a reputation proof with invalid epoch', async () => {
        const invalidEpoch = 3333
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts({
                ...circuitInputs,
                epoch: invalidEpoch,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.reputation,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new ReputationProof(
            r.publicSignals,
            r.proof
        )

        await expect(
            repVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(repVerifierHelper, 'InvalidEpoch')
    })

    it('should fail to verify a reputation proof with invalid state tree root', async () => {
        // invalid chain id will be reverted here
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: 123,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.reputation,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new ReputationProof(
            r.publicSignals,
            r.proof
        )

        await expect(
            repVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(
            repVerifierHelper,
            'InvalidStateTreeRoot'
        )
    })

    it('should fail to verify a reputation proof with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts(circuitInputs)
        )

        const { publicSignals, proof } = new ReputationProof(
            r.publicSignals,
            r.proof
        )
        {
            const _proof = [...proof]
            _proof[0] = BigInt(proof[0]) + BigInt(1)
            await expect(
                repVerifierHelper.verifyAndCheck(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = BigInt(publicSignals[0]) + BigInt(1)

            await expect(
                repVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(repVerifierHelper, 'InvalidProof')
        }
    })

    it('verify that caller is the same as attesterId', async () => {
        const accounts = await ethers.getSigners()
        const randomAttester = accounts[0]
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.reputation,
                stringifyBigInts(circuitInputs)
            )

            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                repVerifierHelper
                    .connect(attester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.not.be.reverted
        }
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.reputation,
                stringifyBigInts(circuitInputs)
            )
            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                repVerifierHelper
                    .connect(randomAttester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.be.revertedWithCustomError(repVerifierHelper, 'CallerInvalid')
        }
    })
})
