// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomNumber, ZkIdentity } from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import {
    Attestation,
    computeProcessAttestationsProofHash,
    computeStartTransitionProofHash,
    deployUnirep,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    Unirep,
    UserTransitionProof,
} from '@unirep/contracts'
import { EPOCH_LENGTH } from '@unirep/circuits/config'

import { genUserState, IUserState, UserState } from '../../src'
import {
    compareEpochTrees,
    compareStates,
    genRandomAttestation,
} from '../utils'

describe('Generate user state', function () {
    this.timeout(0)

    let users: UserState[] = new Array(2)
    const firstUser = 0
    const secondUser = 1
    let userIds: ZkIdentity[] = []
    let userCommitments: bigint[] = []
    let savedUserState: IUserState
    let secondUserState: IUserState

    let unirepContract: Unirep
    let unirepContractCalledByAttester: Unirep

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })
    })

    describe('Attester sign up and set airdrop', () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()
            unirepContractCalledByAttester = unirepContract.connect(
                attester['acct']
            )
            let tx = await unirepContractCalledByAttester.attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContractCalledByAttester.setAirdropAmount(
                airdropPosRep
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(
                attester['addr']
            )
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('User Sign Up event', () => {
        it('users sign up events', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            userIds.push(id)
            userCommitments.push(commitment)

            const initUserState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )

            const tx = await unirepContractCalledByAttester.userSignUp(
                commitment
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const currentEpoch = initUserState.getUnirepStateCurrentEpoch()
            const latestTransitionedToEpoch = currentEpoch
            const UserSignedUpFilter =
                unirepContract.filters.UserSignedUp(currentEpoch)
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )

            expect(userSignedUpEvents.length).equal(1)
            const args = userSignedUpEvents[0]?.args
            const _commitment = (args?.identityCommitment).toBigInt()
            expect(_commitment).equal(userCommitments[firstUser])

            const currentUserState = await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                initUserState.toJSON()
            )
            expect(currentUserState.latestTransitionedEpoch).equal(
                latestTransitionedToEpoch
            )

            savedUserState = currentUserState
        })

        it('users sign up events', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            userIds.push(id)
            userCommitments.push(commitment)

            const tx = await unirepContractCalledByAttester.userSignUp(
                commitment
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)
            users[secondUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser]
            )

            secondUserState = users[secondUser].toJSON()
        })
    })

    describe('Attestation submitted event', () => {
        it('epoch key proof event', async () => {
            const userState = UserState.fromJSON(
                userIds[secondUser],
                secondUserState
            )
            const epochKeyNonce = 2
            const { proof, publicSignals } =
                await userState.genVerifyEpochKeyProof(epochKeyNonce)
            const epochKeyProof = new EpochKeyProof(publicSignals, proof)
            const isValid = await epochKeyProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            let tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const proofIndex = await unirepContract.getProofIndex(
                epochKeyProof.hash()
            )
            expect(proofIndex.toNumber()).not.equal(0)
            const fromProofIndex = 0

            attesterId = (
                await unirepContract.attesters(attester['addr'])
            ).toBigInt()
            const attestation: Attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKeyProof.epochKey,
                proofIndex,
                fromProofIndex,
                { value: attestingFee }
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)
        })

        it('restored user state should match the user state after epoch key proof event', async () => {
            const currentUserState = await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                savedUserState
            )

            savedUserState = currentUserState
        })

        it('reputation proof event', async () => {
            const userState = UserState.fromJSON(
                userIds[firstUser],
                savedUserState
            )
            const epochKeyNonce = 1
            const minRep = 0
            const proveGraffiti = BigInt(0)
            const graffitiPreimage = BigInt(0)
            const nonceList = [BigInt(0), BigInt(1)]
            const maxReputationBudget =
                await unirepContract.maxReputationBudget()
            for (let i = nonceList.length; i < maxReputationBudget; i++) {
                nonceList.push(BigInt(-1))
            }
            const { proof, publicSignals } =
                await userState.genProveReputationProof(
                    attesterId,
                    epochKeyNonce,
                    minRep,
                    proveGraffiti,
                    graffitiPreimage,
                    nonceList
                )
            const reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            const tx = await unirepContractCalledByAttester.spendReputation(
                reputationProof,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit reputation nullifiers failed'
            ).to.equal(1)

            const proofIndex = await unirepContract.getProofIndex(
                reputationProof.hash()
            )
            expect(proofIndex.toNumber()).not.equal(0)
        })

        it('restored user state should match the user state after reputation proof event', async () => {
            const currentUserState = await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                savedUserState
            )

            savedUserState = currentUserState
        })

        it('airdrop proof event', async () => {
            const userState = UserState.fromJSON(
                userIds[firstUser],
                savedUserState
            )
            const { proof, publicSignals } = await userState.genUserSignUpProof(
                attesterId
            )
            const userSignUpProof = new SignUpProof(publicSignals, proof)
            const isValid = await userSignUpProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            const tx = await unirepContractCalledByAttester.airdropEpochKey(
                userSignUpProof,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit airdrop proof failed').to.equal(1)

            const proofIndex = await unirepContract.getProofIndex(
                userSignUpProof.hash()
            )
            expect(proofIndex.toNumber()).not.equal(0)
        })

        it('restored user state should match the user state after airdrop proof event', async () => {
            const currentUserState = await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                savedUserState
            )

            savedUserState = currentUserState
        })
    })

    describe('Epoch transition event', () => {
        it('epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            // Begin epoch transition
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('restored user state should match the user state after epoch transition', async () => {
            const epoch = 1
            const currentUserState = await compareEpochTrees(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                savedUserState,
                epoch
            )

            savedUserState = currentUserState
        })

        it('user state transition', async () => {
            const proofIndexes: ethers.BigNumber[] = []
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await userState.genUserStateTransitionProofs()
            let isValid = await verifyProof(
                Circuit.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isValid, 'Verify start transition circuit off-chain failed')
                .to.be.true

            const blindedUserState = startTransitionProof.blindedUserState
            const blindedHashChain = startTransitionProof.blindedHashChain
            const globalStateTree = startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(
                startTransitionProof.proof
            )
            let tx = await unirepContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a start transition proof:',
                receipt.gasUsed.toString()
            )

            let proofNullifier = computeStartTransitionProofHash(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
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
                const falseInput = BigNumber.from(genRandomNumber())
                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    falseInput,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(
                    receipt.status,
                    'Submit process attestations proof failed'
                ).to.equal(1)

                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(
                    receipt.status,
                    'Submit process attestations proof failed'
                ).to.equal(1)
                console.log(
                    'Gas cost of submit a process attestations proof:',
                    receipt.gasUsed.toString()
                )

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }

            isValid = await verifyProof(
                Circuit.userStateTransition,
                finalTransitionProof.proof,
                finalTransitionProof.publicSignals
            )
            expect(
                isValid,
                'Verify user state transition circuit off-chain failed'
            ).to.be.true

            const transitionProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )

            tx = await unirepContract.updateUserStateRoot(
                transitionProof,
                proofIndexes
            )
            receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a user state transition proof:',
                receipt.gasUsed.toString()
            )
        })

        it('restored user state should match the user state after user state transition', async () => {
            const epoch = 1
            const currentUserState = await compareEpochTrees(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                savedUserState,
                epoch
            )

            savedUserState = currentUserState
        })

        it('epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            // Begin epoch transition
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('restored user state should match the user state after epoch transition', async () => {
            const epoch = 2
            const currentUserState = await compareEpochTrees(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
                secondUserState,
                epoch
            )

            savedUserState = currentUserState
        })

        it('user state transition', async () => {
            const proofIndexes: ethers.BigNumber[] = []
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser]
            )
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await userState.genUserStateTransitionProofs()
            let isValid = await verifyProof(
                Circuit.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isValid, 'Verify start transition circuit off-chain failed')
                .to.be.true

            const blindedUserState = startTransitionProof.blindedUserState
            const blindedHashChain = startTransitionProof.blindedHashChain
            const globalStateTree = startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(
                startTransitionProof.proof
            )
            let tx = await unirepContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a start transition proof:',
                receipt.gasUsed.toString()
            )

            let proofNullifier = computeStartTransitionProofHash(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
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
                const falseInput = BigNumber.from(genRandomNumber())
                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    falseInput,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(
                    receipt.status,
                    'Submit process attestations proof failed'
                ).to.equal(1)

                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(
                    receipt.status,
                    'Submit process attestations proof failed'
                ).to.equal(1)
                console.log(
                    'Gas cost of submit a process attestations proof:',
                    receipt.gasUsed.toString()
                )

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }

            isValid = await verifyProof(
                Circuit.userStateTransition,
                finalTransitionProof.proof,
                finalTransitionProof.publicSignals
            )
            expect(
                isValid,
                'Verify user state transition circuit off-chain failed'
            ).to.be.true

            const transitionProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )

            tx = await unirepContract.updateUserStateRoot(
                transitionProof,
                proofIndexes
            )
            receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a user state transition proof:',
                receipt.gasUsed.toString()
            )
        })

        it('restored user state should match the user state after user state transition', async () => {
            const epoch = 2
            await compareEpochTrees(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
                secondUserState,
                epoch
            )
        })
    })
})
