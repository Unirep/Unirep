// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'

import {
    genUserStateTransitionCircuitInput,
    genInputForContract,
    genNewUserStateTree,
} from './utils'
import { Unirep, UserTransitionProof } from '../src'
import { deployUnirep } from '../src/deploy'

describe('User State Transition', function () {
    this.timeout(600000)
    let unirepContract: Unirep

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    it('Valid user state update inputs should work', async () => {
        const user = new ZkIdentity()
        await unirepContract['userSignUp(uint256)'](
            user.genIdentityCommitment()
        ).then((t) => t.wait())
        const epoch = (await unirepContract.currentEpoch()).toNumber()

        // UST should be performed after epoch transition
        // Fast-forward epochLength of seconds
        const epochLength = (
            await unirepContract.config()
        ).epochLength.toNumber()
        await ethers.provider.send('evm_increaseTime', [epochLength])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = genUserStateTransitionCircuitInput(user, epoch, 0, {
            userStateTree,
            reputationRecords,
        })

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }

        // final users state transition proofs
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )
        const isValid = await input.verify()
        expect(isValid, 'Verify user state transition proof off-chain failed')
            .to.be.true
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true

        const tx = await unirepContract.updateUserStateRoot(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const pfIdx = await unirepContract.getProofIndex(input.hash())
        expect(Number(pfIdx)).not.eq(0)

        for (const nullifier of input.epkNullifiers) {
            if (!ethers.BigNumber.from(nullifier).eq(0)) {
                const n = await unirepContract.usedNullifiers(nullifier)
                expect(
                    ethers.BigNumber.from(n).eq(0),
                    'Nullifier is not saved in unirep contract'
                ).to.be.false
            }
        }

        await expect(
            unirepContract.updateUserStateRoot(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(unirepContract, 'ProofAlreadyUsed')
    })

    it('Submit invalid blinded user state should fail', async () => {
        const epoch = 1
        const user2 = new ZkIdentity()
        await unirepContract['userSignUp(uint256)'](
            user2.genIdentityCommitment()
        ).then((t) => t.wait())
        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const { finalTransitionCircuitInputs } =
            await genUserStateTransitionCircuitInput(user2, epoch, 0, {
                userStateTree,
                reputationRecords,
            })

        // final users state transition proofs
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )
        await expect(
            unirepContract.updateUserStateRoot(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidBlindedUserState'
        )
    })

    it('Submit invalid blinded hash chain should fail', async () => {
        const epoch = 1
        const user3 = new ZkIdentity()
        await unirepContract['userSignUp(uint256)'](
            user3.genIdentityCommitment()
        ).then((t) => t.wait())
        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = await genUserStateTransitionCircuitInput(user3, epoch, 0, {
            userStateTree,
            reputationRecords,
        })

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            const tx = await unirepContract.startUserStateTransition(
                publicSignals,
                proof
            )
            await tx.wait()
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                const tx = await unirepContract.processAttestations(
                    publicSignals,
                    proof
                )
                await tx.wait()
            }
        }
        // final users state transition proofs
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )
        input.publicSignals[input.idx.blindedHashChains[0]] =
            genRandomSalt().toString()
        await expect(
            unirepContract.updateUserStateRoot(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidBlindedHashChain'
        )
    })

    it('Transition from invalid epoch should fail', async () => {
        const user = new ZkIdentity()
        const invalidEpoch = 4
        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = await genUserStateTransitionCircuitInput(user, invalidEpoch, 0, {
            userStateTree,
            reputationRecords,
        })

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }

        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )

        await expect(
            unirepContract.updateUserStateRoot(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidTransitionEpoch'
        )
    })

    it('Submit user state transition proof with the same epoch key nullifiers should fail', async () => {
        // UST should be performed after epoch transition
        // Fast-forward epochLength of seconds
        const epochLength = (
            await unirepContract.config()
        ).epochLength.toNumber()
        await ethers.provider.send('evm_increaseTime', [epochLength])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const user = new ZkIdentity()
        await unirepContract['userSignUp(uint256)'](
            user.genIdentityCommitment()
        ).then((t) => t.wait())
        const epoch = (await unirepContract.currentEpoch()).toNumber()

        await ethers.provider.send('evm_increaseTime', [epochLength])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = await genUserStateTransitionCircuitInput(user, epoch, 0, {
            userStateTree,
            reputationRecords,
        })

        const { finalTransitionCircuitInputs: circuitInputs } =
            await genUserStateTransitionCircuitInput(user, epoch, 0, {
                userStateTree,
                reputationRecords,
            })

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }

        // final users state transition proofs
        {
            const input: UserTransitionProof = await genInputForContract(
                Circuit.userStateTransition,
                finalTransitionCircuitInputs
            )
            await unirepContract
                .updateUserStateRoot(input.publicSignals, input.proof)
                .then((t) => t.wait())
        }

        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        const isValid = await input.verify()
        expect(isValid, 'Verify user state transition proof off-chain failed')
            .to.be.true
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true

        await expect(
            unirepContract.updateUserStateRoot(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(unirepContract, 'NullifierAlreadyUsed')
    })

    it('Invalid GST root should fail', async () => {
        const epoch = 1
        const user2 = new ZkIdentity()
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs: circuitInputs,
        } = genUserStateTransitionCircuitInput(user2, epoch)

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )

        await expect(
            unirepContract.updateUserStateRoot(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidGlobalStateTreeRoot'
        )
    })

    it('Invalid epoch tree root should fail', async () => {
        const epochLength = (
            await unirepContract.config()
        ).epochLength.toNumber()
        await ethers.provider.send('evm_increaseTime', [epochLength])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const user = new ZkIdentity()
        await unirepContract['userSignUp(uint256)'](
            user.genIdentityCommitment()
        ).then((t) => t.wait())
        const epoch = (await unirepContract.currentEpoch()).toNumber()

        await ethers.provider.send('evm_increaseTime', [epochLength])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = await genUserStateTransitionCircuitInput(user, epoch, 3, {
            userStateTree,
            reputationRecords,
        })

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )

        await expect(
            unirepContract.updateUserStateRoot(input.publicSignals, input.proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochTreeRoot')
    })

    it('Invalid proof should fail', async () => {
        const epochLength = (
            await unirepContract.config()
        ).epochLength.toNumber()
        await ethers.provider.send('evm_increaseTime', [epochLength])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const user = new ZkIdentity()
        await unirepContract['userSignUp(uint256)'](
            user.genIdentityCommitment()
        ).then((t) => t.wait())
        const epoch = (await unirepContract.currentEpoch()).toNumber()

        await ethers.provider.send('evm_increaseTime', [epochLength])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = await genUserStateTransitionCircuitInput(user, epoch, 0, {
            userStateTree,
            reputationRecords,
        })

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )
        const invalidProof = new Array(8).fill('0')

        await expect(
            unirepContract.updateUserStateRoot(
                input.publicSignals,
                invalidProof
            )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })
})
