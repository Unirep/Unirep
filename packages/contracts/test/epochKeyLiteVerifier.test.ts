// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { F, genRandomSalt, stringifyBigInts } from '@unirep/utils'
import {
    Circuit,
    EpochKeyLiteProof,
    SignupProof,
    CircuitConfig,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { deployUnirep, deployVerifierHelper } from '../deploy'
import { EPOCH_LENGTH } from './config'
const {
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    ATTESTER_ID_BITS,
    EPOCH_BITS,
    NONCE_BITS,
} = CircuitConfig.default

function randomBits(bit: number) {
    return genRandomSalt() % (BigInt(2) ** BigInt(bit) - BigInt(1))
}

const epoch = 0
const id = new Identity()
const signupCircuitInputs = {
    epoch,
    identity_secret: id.secret,
    chain_id: 0,
    attester_id: 0,
}
let chainId
let attester
let attesterId

describe('Epoch key lite verifier helper', function () {
    this.timeout(300000)

    let unirepContract
    let epochKeyLiteVerifierHelper
    let signupProof: SignupProof
    const sigData = 1234
    const nonce = 2
    const revealNonce = 1
    let circuitInputs = {
        identity_secret: id.secret,
        sig_data: sigData,
        epoch,
        nonce,
        attester_id: 0,
        reveal_nonce: revealNonce,
        chain_id: 0,
    }

    before(async () => {
        const accounts = await ethers.getSigners()
        attester = accounts[1]
        attesterId = await attester.getAddress()
        unirepContract = await deployUnirep(accounts[0])
        const unirepAddress = await unirepContract.getAddress()
        epochKeyLiteVerifierHelper = await deployVerifierHelper(
            unirepAddress,
            accounts[0],
            Circuit.epochKeyLite
        )
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId
        circuitInputs = {
            ...circuitInputs,
            attester_id: attesterId,
            chain_id: chainId,
        }

        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                ...signupCircuitInputs,
                attester_id: attesterId,
                chain_id: chainId,
            })
        )
        signupProof = new SignupProof(r.publicSignals, r.proof, defaultProver)
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

    it('should verify an epoch key lite proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyLite,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKeyLite,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof, ...proofData } =
                new EpochKeyLiteProof(r.publicSignals, r.proof)
            const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
                publicSignals,
                proof
            )

            expect(signals.nonce.toString()).to.equal(
                proofData.nonce.toString()
            )
            expect(signals.epoch.toString()).to.equal(
                proofData.epoch.toString()
            )
            expect(signals.attesterId.toString()).to.equal(
                proofData.attesterId.toString()
            )
            expect(signals.revealNonce).to.equal(true)

            expect(signals.chainId.toString()).to.equal(
                proofData.chainId.toString()
            )
            expect(signals.epochKey.toString()).to.equal(
                proofData.epochKey.toString()
            )
            expect(signals.data.toString()).to.equal(proofData.data.toString())
        }
    })

    it('should decode public signals', async () => {
        const epoch = randomBits(Number(EPOCH_BITS))
        const nonce = randomBits(Number(NONCE_BITS))
        const attesterId = randomBits(Number(ATTESTER_ID_BITS))

        // should reveal nonce
        {
            const revealNonce = BigInt(1)
            const control = EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
                chainId,
            })

            const decodedControl =
                await epochKeyLiteVerifierHelper.decodeEpochKeyControl(control)
            expect(decodedControl.epoch.toString()).to.equal(epoch.toString())
            expect(decodedControl.nonce.toString()).to.equal(nonce.toString())
            expect(decodedControl.attesterId.toString()).to.equal(
                attesterId.toString()
            )
            expect(decodedControl.revealNonce).to.equal(true)
            expect(decodedControl.chainId.toString()).to.equal(
                chainId.toString()
            )
        }

        // should not reveal nonce
        {
            const revealNonce = BigInt(0)
            const control = EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
                chainId,
            })

            const decodedControl =
                await epochKeyLiteVerifierHelper.decodeEpochKeyControl(control)
            expect(decodedControl.epoch.toString()).to.equal(epoch.toString())
            expect(decodedControl.nonce.toString()).to.equal('0')
            expect(decodedControl.attesterId.toString()).to.equal(
                attesterId.toString()
            )
            expect(decodedControl.revealNonce).to.equal(false)
            expect(decodedControl.chainId.toString()).to.equal(
                chainId.toString()
            )
        }
    })

    it('should fail to verify an epoch key lite proof with invalid epoch key', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts(circuitInputs)
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof, idx } = new EpochKeyLiteProof(
            r.publicSignals,
            r.proof
        )

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[idx.epochKey] = F
            await expect(
                epochKeyLiteVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyLiteVerifierHelper,
                'InvalidEpochKey'
            )
        }
    })

    it('should fail to verify an epoch key lite proof with invalid epoch', async () => {
        const invalidEpoch = epoch + 2
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts({
                ...circuitInputs,
                epoch: invalidEpoch,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyLiteProof(
            r.publicSignals,
            r.proof
        )

        {
            await expect(
                epochKeyLiteVerifierHelper.verifyAndCheck(publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyLiteVerifierHelper,
                'InvalidEpoch'
            )
        }
    })

    it('should fail to verify an epoch key lite proof with invalid chain id', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: 123,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyLiteProof(
            r.publicSignals,
            r.proof
        )

        await expect(
            epochKeyLiteVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(
            epochKeyLiteVerifierHelper,
            'ChainIdNotMatch'
        )
    })

    it('should fail to verify an epoch key lite proof with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts(circuitInputs)
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyLiteProof(
            r.publicSignals,
            r.proof
        )
        {
            const _proof = [...proof]
            _proof[0] = BigInt(proof[0]) + BigInt(1)
            await expect(
                epochKeyLiteVerifierHelper.verifyAndCheck(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = BigInt(publicSignals[0]) + BigInt(1)

            await expect(
                epochKeyLiteVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyLiteVerifierHelper,
                'InvalidProof'
            )
        }
    })

    it('verify that msg.sender is the same as attesterId', async () => {
        const accounts = await ethers.getSigners()
        const randomAttester = accounts[0]
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyLite,
                stringifyBigInts(circuitInputs)
            )

            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                epochKeyLiteVerifierHelper
                    .connect(attester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.not.be.reverted
        }
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyLite,
                stringifyBigInts(circuitInputs)
            )
            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                epochKeyLiteVerifierHelper
                    .connect(randomAttester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyLiteVerifierHelper,
                'CallerInvalid'
            )
        }
    })
})
