// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import {
    Attestation,
    deployUnirep,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    Unirep,
} from '@unirep/contracts'
import { EPOCH_LENGTH } from '@unirep/circuits/config'

import { genUserState, IUserState, UserState } from '../../src'
import {
    compareEpochTrees,
    compareStates,
    genRandomAttestation,
    submitUSTProofs,
} from '../utils'

describe('Generate user state', function () {
    this.timeout(0)

    let users: UserState[] = new Array(2)
    const firstUser = 0
    const secondUser = 1
    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let savedUserState: IUserState
    let secondUserState: IUserState

    let unirepContract: Unirep

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

            let tx = await unirepContract
                .connect(attester['acct'])
                .attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContract
                .connect(attester['acct'])
                .setAirdropAmount(airdropPosRep)
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

            const tx = await unirepContract
                .connect(attester['acct'])
                .userSignUp(commitment)
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

            const tx = await unirepContract
                .connect(attester['acct'])
                .userSignUp(commitment)
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

            let tx = await unirepContract.submitEpochKeyProof(
                epochKeyProof.publicSignals,
                epochKeyProof.proof
            )
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
            const epochKey = epochKeyProof.epochKey.toString()
            const attestation: Attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            tx = await unirepContract
                .connect(attester['acct'])
                .submitAttestation(
                    attestation,
                    epochKey,
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

            const tx = await unirepContract
                .connect(attester['acct'])
                .spendReputation(
                    reputationProof.publicSignals,
                    reputationProof.proof,
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

            const tx = await unirepContract
                .connect(attester['acct'])
                .airdropEpochKey(
                    userSignUpProof.publicSignals,
                    userSignUpProof.proof,
                    {
                        value: attestingFee,
                        gasLimit: 1000000,
                    }
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
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )
            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)
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
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser]
            )
            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)
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
