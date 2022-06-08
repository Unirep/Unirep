// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    genEpochKeyCircuitInput,
    genInputForContract,
    genReputationCircuitInput,
    bootstrapRandomUSTree,
    genProveSignUpCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
    deploy,
    genIdentity,
    attesterSignUp,
    keccak256Hash,
} from './utils'
import { config } from './testConfig'
import { Unirep, UnirepTypes } from '../src'
import { CircuitName } from '../../circuits/src'

describe('EventFilters', () => {
    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    const { id, commitment } = genIdentity()

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
    const _config = {
        ...config,
        attestingFee,
    }

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], _config)

        let tx = await unirepContract.userSignUp(commitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        const success = await attesterSignUp(unirepContract, attester)
        expect(success).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)

        tree = new IncrementalMerkleTree(config.globalStateTreeDepth)
        stateRoot = genRandomSalt()
        hashedStateLeaf = hashLeftRight(commitment, stateRoot)
        tree.insert(hashedStateLeaf)
    })

    it('submit an epoch key proof should succeed', async () => {
        const circuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            epoch,
            nonce,
            config
        )
        const input: UnirepTypes.EpochKeyProofStruct =
            await genInputForContract(CircuitName.verifyEpochKey, circuitInputs)
        epochKey = input.epochKey
        const tx = await unirepContract.submitEpochKeyProof(input)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const hash = keccak256Hash(CircuitName.verifyEpochKey, input)
        const proofNullifier = await unirepContract.hashEpochKeyProof(input)
        expect(hash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(hash)
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit attestation should succeed', async () => {
        let attestation: UnirepTypes.AttestationStruct = {
            attesterId,
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            signUp: signedUpInLeaf,
        }

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
        const circuitInputs = await genReputationCircuitInput(
            id,
            epoch,
            nonce,
            reputationRecords,
            BigInt(attesterId),
            undefined,
            undefined,
            undefined,
            undefined,
            config
        )
        const input: UnirepTypes.ReputationProofStruct =
            await genInputForContract(
                CircuitName.proveReputation,
                circuitInputs
            )
        const tx = await unirepContract
            .connect(attester)
            .spendReputation(input, {
                value: attestingFee,
            })
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const hash = keccak256Hash(CircuitName.proveReputation, input)
        const proofNullifier = await unirepContract.hashReputationProof(input)
        expect(hash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(hash)
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit get airdrop should succeed', async () => {
        const { reputationRecords } = await bootstrapRandomUSTree()
        const circuitInputs = await genProveSignUpCircuitInput(
            id,
            epoch,
            reputationRecords,
            BigInt(attesterId),
            undefined,
            config
        )
        const input: UnirepTypes.SignUpProofStruct = await genInputForContract(
            CircuitName.proveUserSignUp,
            circuitInputs
        )

        let tx = await unirepContract.connect(attester).airdropEpochKey(input, {
            value: attestingFee,
        })
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const hash = keccak256Hash(CircuitName.proveUserSignUp, input)
        const proofNullifier = await unirepContract.hashSignUpProof(input)
        expect(hash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(hash)
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit start user state transition should success', async () => {
        const circuitInputs = genStartTransitionCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            epoch,
            nonce
        )
        const { blindedUserState, blindedHashChain, globalStateTree, proof } =
            await genInputForContract(
                CircuitName.startTransition,
                circuitInputs
            )
        const tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            globalStateTree,
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier = await unirepContract.hashStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            globalStateTree,
            proof
        )
        const input = {
            blindedUserState,
            blindedHashChain,
            globalStateTree,
            proof,
        }
        const hash = keccak256Hash(CircuitName.startTransition, input)
        expect(hash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(hash)
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit process attestation proofs should success', async () => {
        const { circuitInputs } = await genProcessAttestationsCircuitInput(
            id,
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
            CircuitName.processAttestations,
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
        const input = {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        }
        const hash = keccak256Hash(CircuitName.processAttestations, input)
        expect(hash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(hash)
        expect(Number(proofIndex)).greaterThan(0)
    })

    it('submit user state transition proofs should success', async () => {
        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [
            config.epochLength,
        ])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const circuitInputs = await genUserStateTransitionCircuitInput(
            id,
            epoch,
            config
        )
        const input: UnirepTypes.UserTransitionProofStruct =
            await genInputForContract(
                CircuitName.userStateTransition,
                circuitInputs
            )
        tx = await unirepContract.updateUserStateRoot(input, indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier =
            await unirepContract.hashUserStateTransitionProof(input)
        const hash = keccak256Hash(CircuitName.userStateTransition, input)
        expect(hash).equal(proofNullifier.toString())
        proofIndex = await unirepContract.getProofIndex(hash)
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
                    config.maxReputationBudget
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
