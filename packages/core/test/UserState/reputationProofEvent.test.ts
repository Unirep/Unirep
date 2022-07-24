// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import { Attestation, deployUnirep } from '@unirep/contracts'

import { genReputationNullifier } from '../../src'
import {
    compareAttestations,
    genRandomAttestation,
    genUserState,
} from '../utils'

// test constants
const maxUsers = 2 ** 7
const attestingFee = ethers.utils.parseEther('0.1')

const genIdAndRepProof = async (unirepContract, attester) => {
    const attesterId = await unirepContract.attesters(attester.address)
    const epkNonce = 0
    const epoch = Number(await unirepContract.currentEpoch())
    const id = new ZkIdentity()
    const commitment = id.genIdentityCommitment()

    const airdropAmount = 100

    await unirepContract
        .connect(attester)
        ['userSignUp(uint256,uint256)'](commitment, airdropAmount)
        .then((t) => t.wait())

    const userState = await genUserState(
        hardhatEthers.provider,
        unirepContract.address,
        id
    )
    const repNullifier = genReputationNullifier(
        id.identityNullifier,
        epoch,
        0,
        attesterId.toBigInt()
    )
    const formattedProof = await userState.genProveReputationProof(
        attesterId.toBigInt(),
        epkNonce,
        0,
        undefined,
        undefined,
        5 // prove amount
    )
    const isValid = await formattedProof.verify()
    expect(isValid).to.be.true
    const tx = await unirepContract
        .connect(attester)
        .spendReputation(formattedProof.publicSignals, formattedProof.proof, {
            value: attestingFee,
        })
    const receipt = await tx.wait()
    expect(receipt.status).to.equal(1)

    await expect(
        unirepContract
            .connect(attester)
            .spendReputation(
                formattedProof.publicSignals,
                formattedProof.proof,
                {
                    value: attestingFee,
                }
            )
    ).to.be.revertedWithCustomError(unirepContract, 'NullifierAlreadyUsed')
    const epochKey = formattedProof.epochKey
    await userState.waitForSync()
    const attestations = await userState.getAttestations(epochKey.toString())
    expect(attestations.length).equal(1)

    // nullifiers should be added to unirepState
    expect(await userState.nullifierExist(repNullifier)).to.be.true
    const proofIndex = Number(
        await unirepContract.getProofIndex(formattedProof.hash())
    )
    return { id, userState, formattedProof, proofIndex }
}

describe('Reputation proof events in Unirep User State', function () {
    this.timeout(0)

    let unirepContract

    let attester

    before(async () => {
        const accounts = await hardhatEthers.getSigners()
        attester = accounts[2]
        unirepContract = await deployUnirep(accounts[0], {
            maxUsers,
            attestingFee,
        })
    })

    describe('Attester sign up', async () => {
        it('attester sign up', async () => {
            let tx = await unirepContract.connect(attester).attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up user through attester who sets airdrop', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()

            const tx = await unirepContract
                .connect(attester)
                ['userSignUp(uint256)'](commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const airdropAmount = 30
            await expect(
                unirepContract
                    .connect(attester)
                    ['userSignUp(uint256,uint256)'](commitment, airdropAmount)
            ).to.be.revertedWithCustomError(
                unirepContract,
                `UserAlreadySignedUp`
            )

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            // const airdroppedAmount = await unirepContract.airdropAmount(
            //     attester.address
            // )
            // signUpAirdrops.push(
            //     new Reputation(
            //         airdroppedAmount.toBigInt(),
            //         BigInt(0),
            //         BigInt(0),
            //         BigInt(1)
            //     )
            // )
            await userState.stop()
        })

        it('sign up users with no airdrop', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()

            const tx = await unirepContract['userSignUp(uint256)'](commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            // signUpAirdrops.push(Reputation.default())
            await userState.stop()
        })
    })

    describe('Reputation proof event', async () => {
        it('submit attestations to the epoch key should update User state', async () => {
            const { proofIndex: fromProofIndex } = await genIdAndRepProof(
                unirepContract,
                attester
            )
            const { formattedProof, userState, proofIndex } =
                await genIdAndRepProof(unirepContract, attester)
            const attestation = genRandomAttestation()
            const attesterId = await unirepContract.attesters(attester.address)
            attestation.attesterId = attesterId
            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    formattedProof.epochKey,
                    proofIndex,
                    fromProofIndex,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)
            await userState.waitForSync()

            const attestations = await userState.getAttestations(
                formattedProof.epochKey.toString()
            )
            expect(attestations.length).equal(2)
            compareAttestations(attestations[1], attestation)
            await userState.stop()
        })

        it('submit attestations to the epoch key should not update User state', async () => {
            const { proofIndex: fromProofIndex } = await genIdAndRepProof(
                unirepContract,
                attester
            )
            const { proofIndex, userState } = await genIdAndRepProof(
                unirepContract,
                attester
            )
            const attesterId = await unirepContract.attesters(attester.address)
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const epochKey = '0x01010101'
            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey,
                    proofIndex,
                    fromProofIndex,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)
            await userState.waitForSync()

            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
            await userState.stop()
        })

        it('spend reputation event can attest to other epoch key and update User state', async () => {
            const { proofIndex: fromProofIndex } = await genIdAndRepProof(
                unirepContract,
                attester
            )
            const { userState } = await genIdAndRepProof(
                unirepContract,
                attester
            )
            const attesterId = await unirepContract.attesters(attester.address)
            const epkNonce = 0
            const formattedProof = await userState.genVerifyEpochKeyProof(
                epkNonce
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            await unirepContract
                .submitEpochKeyProof(
                    formattedProof.publicSignals,
                    formattedProof.proof
                )
                .then((t) => t.wait())

            const toProofIndex = Number(
                await unirepContract.getProofIndex(formattedProof.hash())
            )

            const attestation = new Attestation(
                attesterId.toBigInt(),
                BigInt(5),
                BigInt(0),
                BigInt(0),
                BigInt(0)
            )
            await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    formattedProof.epochKey,
                    toProofIndex,
                    fromProofIndex,
                    { value: attestingFee }
                )
                .then((t) => t.wait())
            await userState.waitForSync()

            const attestations = await userState.getAttestations(
                formattedProof.epochKey.toString()
            )
            expect(attestations.length).equal(2)
            compareAttestations(attestations[1], attestation)
            await userState.stop()
        })

        it('submit invalid reputation proof event', async () => {
            const id = new ZkIdentity()
            const airdropAmount = 20
            await unirepContract
                .connect(attester)
                ['userSignUp(uint256,uint256)'](
                    id.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const attesterId = await unirepContract.attesters(attester.address)
            const epkNonce = 1
            const spendReputation = airdropAmount - 1
            const formattedProof = await userState.genProveReputationProof(
                attesterId.toBigInt(),
                epkNonce,
                undefined,
                undefined,
                undefined,
                spendReputation
            )
            ;(formattedProof as any).publicSignals[
                formattedProof.idx.globalStateTree
            ] = genRandomSalt()
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.false

            const tx = await unirepContract
                .connect(attester)
                .spendReputation(
                    formattedProof.publicSignals,
                    formattedProof.proof,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)
            const attestations = await userState.getAttestations(
                formattedProof.epochKey.toString()
            )
            expect(attestations.length).equal(0)
            await userState.stop()
        })

        it('submit attestations to the epoch key should not update User state', async () => {
            const { proofIndex, userState } = await genIdAndRepProof(
                unirepContract,
                attester
            )
            const attesterId = await unirepContract.attesters(attester.address)
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const epochKey = '0x01010101'
            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(attestation, epochKey, proofIndex, 0, {
                    value: attestingFee,
                })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('invalid reputation proof with from proof index should not update User state', async () => {
            const id = new ZkIdentity()
            const airdropAmount = 10
            await unirepContract
                .connect(attester)
                ['userSignUp(uint256,uint256)'](
                    id.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const epkNonce = 0
            const formattedProof = await userState.genVerifyEpochKeyProof(
                epkNonce
            )
            const startAttestations = await userState.getAttestations(
                formattedProof.epochKey.toString()
            )
            let tx = await unirepContract.submitEpochKeyProof(
                formattedProof.publicSignals,
                formattedProof.proof
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const toProofIndex = Number(
                await unirepContract.getProofIndex(formattedProof.hash())
            )

            const attesterId = await unirepContract.attesters(attester.address)

            const repProof = await userState.genProveReputationProof(
                attesterId.toBigInt(),
                0
            )
            repProof.publicSignals[repProof.idx.repNullifiers[0]] = 1

            await unirepContract
                .connect(attester)
                .spendReputation(repProof.publicSignals, repProof.proof, {
                    value: attestingFee,
                })
                .then((t) => t.wait())

            const fromProofIndex = Number(
                await unirepContract.getProofIndex(repProof.hash())
            )

            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    formattedProof.epochKey,
                    toProofIndex,
                    fromProofIndex,
                    {
                        value: attestingFee,
                    }
                )
                .then((t) => t.wait())

            await userState.waitForSync()
            const attestations = await userState.getAttestations(
                formattedProof.epochKey.toString()
            )
            expect(attestations.length).equal(startAttestations.length)
        })

        it('submit valid reputation proof with wrong GST root event', async () => {
            const id = new ZkIdentity()
            const airdropAmount = 100
            await unirepContract
                .connect(attester)
                ['userSignUp(uint256,uint256)'](
                    id.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const epoch = await userState.getUnirepStateCurrentEpoch()
            await (userState as any)._db.transaction(async (db) => {
                const leaf = genRandomSalt()
                ;(userState as any).globalStateTree.insert(leaf)
                db.create('GSTLeaf', {
                    epoch,
                    transactionHash: '0x0000',
                    hash: leaf.toString(),
                    index: await (userState as any)._db.count('GSTLeaf', {
                        epoch,
                    }),
                })
            })
            // now generate a valid proof from a bad gst
            const attesterId = await unirepContract.attesters(attester.address)
            const epkNonce = 1
            const formattedProof = await userState.genProveReputationProof(
                attesterId.toBigInt(),
                epkNonce,
                undefined,
                undefined,
                undefined,
                airdropAmount - 1
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            const userState2 = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            {
                const tx = await unirepContract
                    .connect(attester)
                    .spendReputation(
                        formattedProof.publicSignals,
                        formattedProof.proof,
                        { value: attestingFee }
                    )
                await userState2.waitForSync()
                const receipt = await tx.wait()
                expect(receipt.status).to.equal(1)
            }
            const proofIndex = Number(
                await unirepContract.getProofIndex(formattedProof.hash())
            )
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    formattedProof.epochKey,
                    proofIndex,
                    0,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            await userState2.waitForSync()
            const attestations = await userState2.getAttestations(
                formattedProof.epochKey.toString()
            )
            expect(attestations.length).equal(0)
            await userState.stop()
            await userState2.stop()
        })

        it('submit valid reputation proof event in wrong epoch should fail', async () => {
            const id = new ZkIdentity()
            const airdropAmount = 100
            await unirepContract
                .connect(attester)
                ['userSignUp(uint256,uint256)'](
                    id.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            // now generate a valid proof from a bad gst
            const attesterId = await unirepContract.attesters(attester.address)
            const epkNonce = 0
            const formattedProof = await userState.genProveReputationProof(
                attesterId.toBigInt(),
                epkNonce,
                undefined,
                undefined,
                undefined,
                airdropAmount - 1
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            const epochLength = (await unirepContract.config()).epochLength
            await hardhatEthers.provider.send('evm_increaseTime', [
                epochLength.toNumber(),
            ])
            await unirepContract.beginEpochTransition().then((t) => t.wait())
            await expect(
                unirepContract
                    .connect(attester)
                    .spendReputation(
                        formattedProof.publicSignals,
                        formattedProof.proof,
                        {
                            value: attestingFee,
                        }
                    )
            ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
            await userState.stop()
        })
    })
})
