// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { Circuit } from '@unirep/circuits'
import {
    genRandomNumber,
    ZkIdentity,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    GLOBAL_STATE_TREE_DEPTH,
    EPOCH_LENGTH,
    MAX_REPUTATION_BUDGET,
} from '@unirep/circuits/config'
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
    computeProcessAttestationsProofHash,
    computeStartTransitionProofHash,
    deployUnirep,
    ReputationProof,
    SignUpProof,
    Unirep,
    UserTransitionProof,
} from '../src'

describe('EventFilters', () => {
    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    const signedUpInLeaf = 1
    const indexes: BigNumber[] = []
    const epoch = 1
    const nonce = 0
    let epochKey
    let proofIndex
    let tree
    let stateRoot = genRandomNumber()
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
        unirepContractCalledByAttester = unirepContract.connect(attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)

        tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        stateRoot = genRandomNumber()
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
        const tx = await unirepContract.submitEpochKeyProof(input)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier = await unirepContract.hashEpochKeyProof(input)
        expect(input.hash()).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit attestation should succeed', async () => {
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomNumber(),
            BigInt(signedUpInLeaf)
        )

        const senderPfIdx = 0
        const tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            proofIndex,
            senderPfIdx,
            { value: attestingFee }
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('spend reputation should succeed', async () => {
        const { reputationRecords } = await bootstrapRandomUSTree()
        const circuitInputs = await genReputationCircuitInput(
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
        const tx = await unirepContractCalledByAttester.spendReputation(input, {
            value: attestingFee,
        })
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier = await unirepContract.hashReputationProof(input)
        expect(input.hash()).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(input.hash())
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit get airdrop should succeed', async () => {
        const { reputationRecords } = await bootstrapRandomUSTree()
        const circuitInputs = await genProveSignUpCircuitInput(
            userId,
            epoch,
            reputationRecords,
            BigInt(attesterId)
        )
        const input: SignUpProof = await genInputForContract(
            Circuit.proveUserSignUp,
            circuitInputs
        )

        let tx = await unirepContractCalledByAttester.airdropEpochKey(input, {
            value: attestingFee,
        })
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier = await unirepContract.hashSignUpProof(input)
        expect(input.hash()).equal(proofNullifier.toString())
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
        const { blindedUserState, blindedHashChain, GSTRoot, proof } =
            await genInputForContract(Circuit.startTransition, circuitInputs)
        const tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier = await unirepContract.hashStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof
        )
        const computedHash = computeStartTransitionProofHash(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof
        )
        expect(computedHash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(computedHash)
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit process attestation proofs should success', async () => {
        const { circuitInputs } = await genProcessAttestationsCircuitInput(
            userId,
            BigInt(epoch),
            BigInt(nonce),
            BigInt(nonce)
        )
        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = await genInputForContract(
            Circuit.processAttestations,
            circuitInputs
        )
        const tx = await unirepContract.processAttestations(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier =
            await unirepContract.hashProcessAttestationsProof(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                proof
            )
        const computedHash = computeProcessAttestationsProofHash(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        )
        expect(computedHash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(computedHash)
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit user state transition proofs should success', async () => {
        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const circuitInputs = await genUserStateTransitionCircuitInput(
            userId,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        tx = await unirepContract.updateUserStateRoot(input, indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier =
            await unirepContract.hashUserStateTransitionProof(input)
        expect(input.hash()).equal(proofNullifier.toString())
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
            const epochKeyProofEvent = await unirepContract.queryFilter(
                epochKeyProofFilter
            )
            const repProofFilter =
                unirepContract.filters.IndexedReputationProof(proofIndex)
            const repProofEvent = await unirepContract.queryFilter(
                repProofFilter
            )
            const signUpProofFilter =
                unirepContract.filters.IndexedUserSignedUpProof(proofIndex)
            const signUpProofEvent = await unirepContract.queryFilter(
                signUpProofFilter
            )

            if (epochKeyProofEvent.length == 1) {
                console.log('epoch key proof event')
                const args = epochKeyProofEvent[0]?.args?.proof
                const isValid = await unirepContract.verifyEpochKeyValidity(
                    args
                )
                expect(isValid).equal(true)
            } else if (repProofEvent.length == 1) {
                console.log('reputation proof event')
                const args = repProofEvent[0]?.args?.proof
                expect(args?.repNullifiers.length).to.equal(
                    MAX_REPUTATION_BUDGET
                )
                const isValid = await unirepContract.verifyReputation(args)
                expect(isValid).equal(true)
            } else if (signUpProofEvent.length == 1) {
                console.log('sign up proof event')
                const args = signUpProofEvent[0]?.args?.proof
                const isValid = await unirepContract.verifyUserSignUp(args)
                expect(isValid).equal(true)
            }
        }
    })

    it('user state transition proof should match and correctly emitted', async () => {
        {
            const startTransitionFilter =
                unirepContract.filters.IndexedStartedTransitionProof()
            const startTransitionEvents = await unirepContract.queryFilter(
                startTransitionFilter
            )
            expect(startTransitionEvents.length).to.equal(1)
            const {
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof,
            } = startTransitionEvents[0]?.args
            let isValid = await unirepContract.verifyStartTransitionProof(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            expect(isValid).equal(true)
        }

        {
            const processAttestationFilter =
                unirepContract.filters.IndexedProcessedAttestationsProof()
            const processAttestationEvents = await unirepContract.queryFilter(
                processAttestationFilter
            )
            expect(processAttestationEvents.length).to.equal(1)
            const {
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                proof,
            } = processAttestationEvents[0]?.args
            const isValid = await unirepContract.verifyProcessAttestationProof(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                proof
            )
            expect(isValid).equal(true)
        }

        {
            const userStateTransitionFilter =
                unirepContract.filters.IndexedUserStateTransitionProof()
            const userStateTransitionEvents = await unirepContract.queryFilter(
                userStateTransitionFilter
            )
            expect(userStateTransitionEvents.length).to.equal(1)
            const args = userStateTransitionEvents[0]?.args?.proof
            const isValid = await unirepContract.verifyUserStateTransition(args)
            expect(isValid).equal(true)
        }
    })
})
