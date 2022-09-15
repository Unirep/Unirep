// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import {
    genInputForContract,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
} from './utils'
import { ProcessAttestationsProof, Unirep } from '../src'
import { deployUnirep } from '../deploy'
import { Circuit } from '@unirep/circuits'

describe('Process attestation circuit', function () {
    this.timeout(300000)

    let accounts: ethers.Signer[]
    let unirepContract: Unirep

    const epoch = 1
    const nonce = 0
    const user = new ZkIdentity()

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])
    })

    it('successfully process attestations', async () => {
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
        } = genUserStateTransitionCircuitInput(user, epoch)

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const input: ProcessAttestationsProof =
                    await genInputForContract(
                        Circuit.processAttestations,
                        circuitInputs
                    )

                const isProofValid =
                    await unirepContract.verifyProcessAttestationProof(
                        input.publicSignals,
                        input.proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.processAttestations(
                    input.publicSignals,
                    input.proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const pfIdx = await unirepContract.getProofIndex(input.hash())
                expect(Number(pfIdx)).not.eq(0)

                // submit proof again should fail
                await expect(
                    unirepContract.processAttestations(
                        input.publicSignals,
                        input.proof
                    )
                ).to.be.revertedWithCustomError(
                    unirepContract,
                    'ProofAlreadyUsed'
                )

                const blindedUserStateExists =
                    await unirepContract.submittedBlindedUserStates(
                        input.outputBlindedUserState
                    )
                expect(blindedUserStateExists).to.be.true
                const blindedHashChainExists =
                    await unirepContract.submittedBlindedHashChains(
                        input.outputBlindedHashChain
                    )
                expect(blindedHashChainExists).to.be.true
            }
        }
    })

    it('successfully process zero attestations', async () => {
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
        } = genUserStateTransitionCircuitInput(user, epoch, 0)

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const input = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                const isProofValid =
                    await unirepContract.verifyProcessAttestationProof(
                        input.publicSignals,
                        input.proof
                    )
                expect(isProofValid).to.be.true

                const tx = await unirepContract.processAttestations(
                    input.publicSignals,
                    input.proof
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const pfIdx = await unirepContract.getProofIndex(input.hash())
                expect(Number(pfIdx)).not.eq(0)
            }
        }
    })

    it('submit proof with un-submitted blinded user state should fail', async () => {
        const { circuitInputs } = genProcessAttestationsCircuitInput(
            user,
            epoch,
            nonce,
            nonce
        )

        const input = await genInputForContract(
            Circuit.processAttestations,
            circuitInputs
        )
        const isProofValid = await unirepContract.verifyProcessAttestationProof(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true

        await expect(
            unirepContract.processAttestations(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidBlindedUserState'
        )
    })

    it('submitting invalid process attestations proof should fail', async () => {
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
        } = genUserStateTransitionCircuitInput(user, epoch, 0)

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        const input: ProcessAttestationsProof = await genInputForContract(
            Circuit.processAttestations,
            processAttestationCircuitInputs[0]
        )
        input.publicSignals[input.idx.outputBlindedHashChain] =
            genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyProcessAttestationProof(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false

        await expect(
            unirepContract.processAttestations(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })
})
