// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'

import {
    genUserStateTransitionCircuitInput,
    genInputForContract,
} from './utils'
import { deployUnirep, Unirep, UserTransitionProof } from '../src'

describe('User State Transition', function () {
    this.timeout(600000)
    let accounts: ethers.Signer[]
    let unirepContract: Unirep

    const epoch = 1
    const user = new ZkIdentity()
    const proofIndexes = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])

        // UST should be performed after epoch transition
        // Fast-forward epochLength of seconds
        const epochLength = (
            await unirepContract.config()
        ).epochLength.toNumber()
        await hardhatEthers.provider.send('evm_increaseTime', [epochLength])
        const tx = await unirepContract.beginEpochTransition()
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('Valid user state update inputs should work', async () => {
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = await genUserStateTransitionCircuitInput(user, epoch)

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
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                unirepContract
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
            input.proof,
            proofIndexes
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
    })

    it('Submit user state transition proof with the same epoch key nullifiers should fail', async () => {
        const { finalTransitionCircuitInputs: circuitInputs } =
            await genUserStateTransitionCircuitInput(user, epoch)
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
            unirepContract.updateUserStateRoot(
                input.publicSignals,
                input.proof,
                proofIndexes
            )
        ).to.be.revertedWithCustomError(unirepContract, 'NullifierAlreadyUsed')
    })

    it('Proof with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.transitionFromEpoch] =
            wrongEpoch.toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree root should fail', async () => {
        const wrongGlobalStateTreeRoot = genRandomSalt().toString()
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.fromGlobalStateTree] =
            wrongGlobalStateTreeRoot
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong blinded user states should fail', async () => {
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.blindedUserStates[0]] =
            genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong blinded hash chain should fail', async () => {
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.blindedHashChains[0]] =
            genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree leaf should fail', async () => {
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.newGlobalStateTreeLeaf] =
            genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })
})
