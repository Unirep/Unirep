// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    ZkIdentity,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    GLOBAL_STATE_TREE_DEPTH,
    EPOCH_LENGTH,
    Circuit,
} from '@unirep/circuits'
import {
    Attestation,
    genEpochKeyCircuitInput,
    genInputForContract,
    genReputationCircuitInput,
    bootstrapRandomUSTree,
    genProveSignUpCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
} from './utils'
import {
    deployUnirep,
    ReputationProof,
    SignUpProof,
    Unirep,
    UserTransitionProof,
} from '../src'
import {
    IndexedEpochKeyProofEvent,
    IndexedProcessedAttestationsProofEvent,
    IndexedReputationProofEvent,
    IndexedStartedTransitionProofEvent,
    IndexedUserSignedUpProofEvent,
    IndexedUserStateTransitionProofEvent,
} from '../typechain/Unirep'

describe('EventFilters', () => {
    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId

    const signedUpInLeaf = 1
    const indexes: BigNumber[] = []
    const epoch = 1
    const nonce = 0
    let epochKey
    let proofIndex
    let tree
    let stateRoot = genRandomSalt()
    let hashedStateLeaf
    const leafIndex = 0
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })

        console.log('User sign up')
        userId = new ZkIdentity()
        userCommitment = userId.genIdentityCommitment()
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attesters sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()

        tx = await unirepContract.connect(attester).attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)

        tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        stateRoot = genRandomSalt()
        hashedStateLeaf = hashLeftRight(userCommitment, stateRoot)
        tree.insert(BigInt(hashedStateLeaf.toString()))
    })

    it('submit an epoch key proof should succeed', async () => {
        const circuitInputs = genEpochKeyCircuitInput(
            userId,
            tree,
            leafIndex,
            stateRoot,
            epoch,
            nonce
        )
        const input = await genInputForContract(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        epochKey = input.epochKey
        const tx = await unirepContract.submitEpochKeyProof(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit attestation should succeed', async () => {
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )

        const senderPfIdx = 0
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(attestation, epochKey, proofIndex, senderPfIdx, {
                value: attestingFee,
            })
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('spend reputation should succeed', async () => {
        const { reputationRecords } = await bootstrapRandomUSTree()
        const circuitInputs = genReputationCircuitInput(
            userId,
            epoch,
            nonce,
            reputationRecords,
            BigInt(attesterId)
        )
        const input: ReputationProof = await genInputForContract(
            Circuit.proveReputation,
            circuitInputs
        )
        const tx = await unirepContract
            .connect(attester)
            .spendReputation(input.publicSignals, input.proof, {
                value: attestingFee,
            })
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit get airdrop should succeed', async () => {
        const { reputationRecords } = await bootstrapRandomUSTree()
        const circuitInputs = genProveSignUpCircuitInput(
            userId,
            epoch,
            reputationRecords,
            BigInt(attesterId)
        )
        const input: SignUpProof = await genInputForContract(
            Circuit.proveUserSignUp,
            circuitInputs
        )

        let tx = await unirepContract
            .connect(attester)
            .airdropEpochKey(input.publicSignals, input.proof, {
                value: attestingFee,
            })
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit start user state transition should success', async () => {
        const circuitInputs = genStartTransitionCircuitInput(
            userId,
            tree,
            leafIndex,
            stateRoot,
            epoch,
            nonce
        )
        const input = await genInputForContract(
            Circuit.startTransition,
            circuitInputs
        )
        const tx = await unirepContract.startUserStateTransition(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit process attestation proofs should success', async () => {
        const { circuitInputs } = genProcessAttestationsCircuitInput(
            userId,
            BigInt(epoch),
            BigInt(nonce),
            BigInt(nonce)
        )
        const input = await genInputForContract(
            Circuit.processAttestations,
            circuitInputs
        )
        const tx = await unirepContract.processAttestations(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit user state transition proofs should success', async () => {
        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const circuitInputs = genUserStateTransitionCircuitInput(userId, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        tx = await unirepContract.updateUserStateRoot(
            input.publicSignals,
            input.proof,
            indexes
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit attestation events should match and correctly emitted', async () => {
        const attestationSubmittedFilter =
            unirepContract.filters.AttestationSubmitted()
        const attestationSubmittedEvents = await unirepContract.queryFilter(
            attestationSubmittedFilter
        )

        // compute hash chain of valid epoch key
        for (let i = 0; i < attestationSubmittedEvents.length; i++) {
            const proofIndex = attestationSubmittedEvents[i].args?.toProofIndex
            const epochKeyProofFilter =
                unirepContract.filters.IndexedEpochKeyProof(proofIndex)
            const epochKeyProofEvent: IndexedEpochKeyProofEvent[] =
                await unirepContract.queryFilter(epochKeyProofFilter)
            const repProofFilter =
                unirepContract.filters.IndexedReputationProof(proofIndex)
            const repProofEvent: IndexedReputationProofEvent[] =
                await unirepContract.queryFilter(repProofFilter)
            const signUpProofFilter =
                unirepContract.filters.IndexedUserSignedUpProof(proofIndex)
            const signUpProofEvent: IndexedUserSignedUpProofEvent[] =
                await unirepContract.queryFilter(signUpProofFilter)

            if (epochKeyProofEvent.length == 1) {
                console.log('epoch key proof event')
                const { proof, publicSignals } = epochKeyProofEvent[0].args
                const isValid = await unirepContract.verifyEpochKeyValidity(
                    publicSignals,
                    proof
                )
                expect(isValid).equal(true)
            } else if (repProofEvent.length == 1) {
                console.log('reputation proof event')
                const { proof, publicSignals } = repProofEvent[0].args
                const isValid = await unirepContract.verifyReputation(
                    publicSignals,
                    proof
                )
                expect(isValid).equal(true)
            } else if (signUpProofEvent.length == 1) {
                console.log('sign up proof event')
                const { proof, publicSignals } = signUpProofEvent[0].args
                const isValid = await unirepContract.verifyUserSignUp(
                    publicSignals,
                    proof
                )
                expect(isValid).equal(true)
            }
        }
    })

    it('user state transition proof should match and correctly emitted', async () => {
        {
            const startTransitionFilter =
                unirepContract.filters.IndexedStartedTransitionProof()
            const startTransitionEvents: IndexedStartedTransitionProofEvent[] =
                await unirepContract.queryFilter(startTransitionFilter)
            expect(startTransitionEvents.length).to.equal(1)
            const { publicSignals, proof } = startTransitionEvents[0].args
            let isValid = await unirepContract.verifyStartTransitionProof(
                publicSignals,
                proof
            )
            expect(isValid).equal(true)
        }

        {
            const processAttestationFilter =
                unirepContract.filters.IndexedProcessedAttestationsProof()
            const processAttestationEvents: IndexedProcessedAttestationsProofEvent[] =
                await unirepContract.queryFilter(processAttestationFilter)
            expect(processAttestationEvents.length).to.equal(1)
            const { publicSignals, proof } = processAttestationEvents[0].args
            const isValid = await unirepContract.verifyProcessAttestationProof(
                publicSignals,
                proof
            )
            expect(isValid).equal(true)
        }

        {
            const userStateTransitionFilter =
                unirepContract.filters.IndexedUserStateTransitionProof()
            const userStateTransitionEvents: IndexedUserStateTransitionProofEvent[] =
                await unirepContract.queryFilter(userStateTransitionFilter)
            expect(userStateTransitionEvents.length).to.equal(1)
            const { publicSignals, proof } = userStateTransitionEvents[0].args
            const isValid = await unirepContract.verifyUserStateTransition(
                publicSignals,
                proof
            )
            expect(isValid).equal(true)
        }
    })
})
