// @ts-ignore
import fs from 'fs'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { EPOCH_LENGTH } from '@unirep/circuits'
import {
    Attestation,
    deployUnirep,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    Unirep,
} from '@unirep/contracts'

import { genUserState, schema, UserState } from '../../src'
import { compareStates, genRandomAttestation, submitUSTProofs } from '../utils'
import { SQLiteConnector } from 'anondb/node'

describe('Generate user state', function () {
    this.timeout(0)

    let users: UserState[] = new Array(2)
    const firstUser = 0
    const secondUser = 1
    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []

    let unirepContract: Unirep

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId
    const attestingFee = ethers.utils.parseEther('0.1')

    const firstDbPath = `firstUserState.sqlite`
    const secondDbPath = `secondtUserState.sqlite`
    const db: Promise<SQLiteConnector>[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })

        db.push(SQLiteConnector.create(schema, firstDbPath))
        db.push(SQLiteConnector.create(schema, secondDbPath))
    })

    after(async () => {
        fs.unlinkSync(firstDbPath)
        fs.unlinkSync(secondDbPath)
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
                userIds[firstUser],
                await db[firstUser]
            )

            const tx = await unirepContract
                .connect(attester['acct'])
                .userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const currentEpoch =
                await initUserState.getUnirepStateCurrentEpoch()
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

            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                db[firstUser]
            )

            await initUserState.waitForSync()
            users[firstUser] = initUserState
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
                userIds[secondUser],
                await db[secondUser]
            )
        })
    })

    describe('Attestation submitted event', () => {
        it('epoch key proof event', async () => {
            await users[secondUser].waitForSync()
            const epochKeyNonce = 2
            const { proof, publicSignals } = await users[
                secondUser
            ].genVerifyEpochKeyProof(epochKeyNonce)
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
            tx = await unirepContract
                .connect(attester['acct'])
                .submitAttestation(
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
            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                db[firstUser]
            )
        })

        it('reputation proof event', async () => {
            await users[firstUser].waitForSync()
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
            const { proof, publicSignals } = await users[
                firstUser
            ].genProveReputationProof(
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
                .spendReputation(reputationProof, { value: attestingFee })
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
            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                db[firstUser]
            )
        })

        it('airdrop proof event', async () => {
            const { proof, publicSignals } = await users[
                firstUser
            ].genUserSignUpProof(attesterId)
            const userSignUpProof = new SignUpProof(publicSignals, proof)
            const isValid = await userSignUpProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            const tx = await unirepContract
                .connect(attester['acct'])
                .airdropEpochKey(userSignUpProof, {
                    value: attestingFee,
                    gasLimit: 1000000,
                })
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit airdrop proof failed').to.equal(1)

            const proofIndex = await unirepContract.getProofIndex(
                userSignUpProof.hash()
            )
            expect(proofIndex.toNumber()).not.equal(0)
        })

        it('restored user state should match the user state after airdrop proof event', async () => {
            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                db[firstUser]
            )
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
            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                db[firstUser]
            )
        })

        it('user state transition', async () => {
            await users[firstUser].waitForSync()
            const proofs = await users[firstUser].genUserStateTransitionProofs()

            await submitUSTProofs(unirepContract, proofs)
        })

        it('restored user state should match the user state after user state transition', async () => {
            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                db[firstUser]
            )
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
            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
                db[secondUser]
            )
        })

        it('user state transition', async () => {
            await users[secondUser].waitForSync()
            const proofs = await users[
                secondUser
            ].genUserStateTransitionProofs()

            await submitUSTProofs(unirepContract, proofs)
        })

        it('restored user state should match the user state after user state transition', async () => {
            await compareStates(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
                db[secondUser]
            )
        })
    })
})
