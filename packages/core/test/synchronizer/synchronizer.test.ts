import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    EPOCH_LENGTH,
    defaultProver,
} from '@unirep/circuits'
import {
    computeProcessAttestationsProofHash,
    computeStartTransitionProofHash,
    deployUnirep,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
} from '@unirep/contracts'

const attestingFee = ethers.utils.parseEther('0.1')

import { genUserState, Synchronizer, schema } from '../../src'
import { genRandomAttestation } from '../utils'
import { SQLiteConnector } from 'anondb/node'

let synchronizer: Synchronizer

describe('Synchronizer process events', function () {
    this.timeout(100000)

    before(async () => {
        const accounts = await ethers.getSigners()
        const unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
        const db = await SQLiteConnector.create(schema, ':memory:')
        synchronizer = new Synchronizer(db, defaultProver, unirepContract)
        // now create an attester
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp()
            .then((t) => t.wait())
        await synchronizer.start()
    })

    it('should process sign up event', async () => {
        const [UserSignedUp] =
            synchronizer.unirepContract.filters.UserSignedUp()
                .topics as string[]
        const signUpEvent = new Promise((rs, rj) =>
            synchronizer.once(UserSignedUp, (event) => rs(event))
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const tx = await synchronizer.unirepContract
            .connect(accounts[1])
            .userSignUp(commitment)
        const receipt = await tx.wait()
        expect(receipt.status, 'User sign up failed').to.equal(1)
        await signUpEvent
    })

    it('should process epk proof event and attestation', async () => {
        const [IndexedEpochKeyProof] =
            synchronizer.unirepContract.filters.IndexedEpochKeyProof()
                .topics as string[]
        const proofEvent = new Promise((rs, rj) =>
            synchronizer.once(IndexedEpochKeyProof, (event) => rs(event))
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const tx = await synchronizer.unirepContract
            .connect(accounts[1])
            .userSignUp(commitment)
        const receipt = await tx.wait()
        expect(receipt.status, 'User sign up failed').to.equal(1)
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )
        const epochKeyNonce = 2
        const { proof, publicSignals } = await userState.genVerifyEpochKeyProof(
            epochKeyNonce
        )
        const epochKeyProof = new EpochKeyProof(publicSignals, proof)
        const isValid = await epochKeyProof.verify()
        expect(isValid, 'Verify epk proof off-chain failed').to.be.true
        await synchronizer.unirepContract
            .submitEpochKeyProof(epochKeyProof)
            .then((t) => t.wait())
        await proofEvent

        const [AttestationSubmitted] =
            synchronizer.unirepContract.filters.AttestationSubmitted()
                .topics as string[]
        const attestationEvent = new Promise((rs, rj) =>
            synchronizer.once(AttestationSubmitted, (event) => rs(event))
        )
        const proofIndex = await synchronizer.unirepContract.getProofIndex(
            epochKeyProof.hash()
        )
        const attestation = genRandomAttestation()
        attestation.attesterId = await synchronizer.unirepContract.attesters(
            accounts[1].address
        )
        await synchronizer.unirepContract
            .connect(accounts[1])
            .submitAttestation(
                attestation,
                epochKeyProof.epochKey,
                proofIndex,
                0, // from proof index
                { value: attestingFee }
            )
            .then((t) => t.wait())
        await attestationEvent
    })

    it('should process reputation proof', async () => {
        const [IndexedReputationProof] =
            synchronizer.unirepContract.filters.IndexedReputationProof()
                .topics as string[]
        const proofEvent = new Promise((rs, rj) =>
            synchronizer.once(IndexedReputationProof, (event) => rs(event))
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            .userSignUp(commitment)
            .then((t) => t.wait())
        expect(receipt.status, 'User sign up failed').to.equal(1)
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )

        const epochKeyNonce = 1
        const minRep = 0
        const proveGraffiti = BigInt(0)
        const graffitiPreimage = BigInt(0)
        const nonceList = [] as BigInt[]
        const maxReputationBudget =
            await synchronizer.unirepContract.maxReputationBudget()
        for (let i = nonceList.length; i < maxReputationBudget; i++) {
            nonceList.push(BigInt(-1))
        }
        const { proof, publicSignals } =
            await userState.genProveReputationProof(
                (
                    await synchronizer.unirepContract.attesters(
                        accounts[1].address
                    )
                ).toBigInt(),
                epochKeyNonce,
                minRep,
                proveGraffiti,
                graffitiPreimage,
                nonceList
            )
        const reputationProof = new ReputationProof(publicSignals, proof)
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify epk proof off-chain failed').to.be.true

        await synchronizer.unirepContract
            .connect(accounts[1])
            .spendReputation(reputationProof, { value: attestingFee })
            .then((t) => t.wait())
        await proofEvent
    })

    it('should process sign up proof', async () => {
        const [IndexedUserSignedUpProof] =
            synchronizer.unirepContract.filters.IndexedUserSignedUpProof()
                .topics as string[]
        const proofEvent = new Promise((rs, rj) =>
            synchronizer.once(IndexedUserSignedUpProof, (event) => rs(event))
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            .userSignUp(commitment)
            .then((t) => t.wait())
        expect(receipt.status, 'User sign up failed').to.equal(1)
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )
        const { proof, publicSignals } = await userState.genUserSignUpProof(
            (
                await synchronizer.unirepContract.attesters(accounts[1].address)
            ).toBigInt()
        )
        const userSignUpProof = new SignUpProof(publicSignals, proof)
        const isValid = await userSignUpProof.verify()
        expect(isValid, 'Verify sign up proof off-chain failed').to.be.true

        await synchronizer.unirepContract
            .connect(accounts[1])
            .airdropEpochKey(userSignUpProof, {
                value: attestingFee,
                gasLimit: 1000000,
            })
            .then((t) => t.wait())
        await proofEvent
    })

    it('should process epoch transition', async () => {
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])

        const [EpochEnded] = synchronizer.unirepContract.filters.EpochEnded()
            .topics as string[]
        const epochEndedEvent = new Promise((rs, rj) =>
            synchronizer.once(EpochEnded, (event) => rs(event))
        )
        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        await epochEndedEvent
    })
    it('should process ust events', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            .userSignUp(commitment)
            .then((t) => t.wait())
        expect(receipt.status, 'User sign up failed').to.equal(1)
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])

        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        const {
            startTransitionProof,
            processAttestationProofs,
            finalTransitionProof,
        } = await userState.genUserStateTransitionProofs()
        let isValid = await defaultProver.verifyProof(
            Circuit.startTransition,
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        expect(isValid, 'Verify start transition circuit off-chain failed').to
            .be.true
        const blindedUserState = startTransitionProof.blindedUserState
        const blindedHashChain = startTransitionProof.blindedHashChain
        const globalStateTree = startTransitionProof.globalStateTreeRoot
        const proof = formatProofForVerifierContract(startTransitionProof.proof)
        const [IndexedStartedTransitionProof] =
            synchronizer.unirepContract.filters.IndexedStartedTransitionProof()
                .topics as string[]
        const _startTransitionProof = new Promise((rs, rj) =>
            synchronizer.once(IndexedStartedTransitionProof, (event) =>
                rs(event)
            )
        )
        await synchronizer.unirepContract
            .startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            .then((t) => t.wait())
        await _startTransitionProof

        const proofIndexes: any[] = []

        let proofNullifier = computeStartTransitionProofHash(
            blindedUserState,
            blindedHashChain,
            globalStateTree,
            proof
        )
        let proofIndex = await synchronizer.unirepContract.getProofIndex(
            proofNullifier
        )
        proofIndexes.push(proofIndex)

        for (let i = 0; i < processAttestationProofs.length; i++) {
            isValid = await defaultProver.verifyProof(
                Circuit.processAttestations,
                processAttestationProofs[i].publicSignals,
                processAttestationProofs[i].proof
            )
            expect(
                isValid,
                'Verify process attestations circuit off-chain failed'
            ).to.be.true

            const outputBlindedUserState =
                processAttestationProofs[i].outputBlindedUserState
            const outputBlindedHashChain =
                processAttestationProofs[i].outputBlindedHashChain
            const inputBlindedUserState =
                processAttestationProofs[i].inputBlindedUserState

            // submit random process attestations should success and not affect the results
            const falseInput = BigNumber.from(genRandomSalt())
            const [IndexedProcessedAttestationsProof] =
                synchronizer.unirepContract.filters.IndexedProcessedAttestationsProof()
                    .topics as string[]
            const _processedAttestations = new Promise((rs, rj) =>
                synchronizer.once(IndexedProcessedAttestationsProof, (event) =>
                    rs(event)
                )
            )
            await synchronizer.unirepContract
                .processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    falseInput,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                .then((t) => t.wait())
            await _processedAttestations

            const __processedAttestations = new Promise((rs, rj) =>
                synchronizer.once(IndexedProcessedAttestationsProof, (event) =>
                    rs(event)
                )
            )
            await synchronizer.unirepContract
                .processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                .then((t) => t.wait())
            await __processedAttestations

            const proofNullifier = computeProcessAttestationsProofHash(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(
                    processAttestationProofs[i].proof
                )
            )
            const proofIndex = await synchronizer.unirepContract.getProofIndex(
                proofNullifier
            )
            proofIndexes.push(proofIndex)
        }

        isValid = await defaultProver.verifyProof(
            Circuit.userStateTransition,
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )
        expect(isValid, 'Verify user state transition circuit off-chain failed')
            .to.be.true

        const transitionProof = new UserTransitionProof(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )

        const [UserStateTransitioned] =
            synchronizer.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        const ust = new Promise((rs, rj) =>
            synchronizer.once(UserStateTransitioned, (event) => rs(event))
        )
        await synchronizer.unirepContract
            .updateUserStateRoot(transitionProof, proofIndexes)
            .then((t) => t.wait())
        await ust
    })
})
