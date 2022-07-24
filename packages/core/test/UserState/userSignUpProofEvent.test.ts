// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    ZkIdentity,
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { deployUnirep, SignUpProof, Unirep } from '@unirep/contracts'

import { Reputation } from '../../src'
import {
    compareAttestations,
    genNewUserStateTree,
    genProveSignUpCircuitInput,
    genRandomAttestation,
    genUnirepState,
    genUserState,
} from '../utils'

describe('User sign up proof (Airdrop proof) events in Unirep User State', function () {
    this.timeout(30 * 60 * 1000)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep

    let accounts: ethers.Signer[]
    let attester
    let attesterId
    const maxUsers = 100
    const attestingFee = ethers.utils.parseEther('0.1')
    const fromProofIndex = 0

    before(async () => {
        accounts = await hardhatEthers.getSigners()
        attester = accounts[2]

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
            attestingFee,
        })
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            let tx = await unirepContract.connect(attester).attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = await unirepContract.attesters(attester.address)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContract
                .connect(attester)
                .setAirdropAmount(airdropPosRep)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(
                attester.address
            )
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract
                    .connect(attester)
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract.connect(attester).userSignUp(commitment)
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

                const airdroppedAmount = await unirepContract.airdropAmount(
                    attester.address
                )
                signUpAirdrops.push(
                    new Reputation(
                        airdroppedAmount.toBigInt(),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
                await userState.stop()
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract
                    .connect(attester)
                    .userSignUp(commitment)
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

                signUpAirdrops.push(Reputation.default())
                await userState.stop()
            }
        })
    })

    describe('Airdrop proof event', async () => {
        let epochKey
        let proofIndex
        let epoch
        const userIdx = 3
        it('submit airdrop proof event', async () => {
            epoch = Number(await unirepContract.currentEpoch())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )

            const formattedProof = await userState.genUserSignUpProof(
                BigInt(attesterId)
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester)
                .airdropEpochKey(
                    formattedProof.publicSignals,
                    formattedProof.proof,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = formattedProof.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(formattedProof.hash())
            )

            await expect(
                unirepContract
                    .connect(attester)
                    .airdropEpochKey(
                        formattedProof.publicSignals,
                        formattedProof.proof,
                        {
                            value: attestingFee,
                        }
                    )
            ).to.be.revertedWithCustomError(
                unirepContract,
                'NullifierAlreadyUsed'
            )
            await userState.stop()
        })

        it('airdropEpochKey event should update Unirep state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            const [epochKey] = await userState.getEpochKeys(currentEpoch)
            const attestations = await userState.getAttestations(
                epochKey.toString()
            )
            expect(attestations.length).equal(1)
            await userState.stop()
        })

        it('submit attestations to the epoch key should update Unirep state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
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

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
            compareAttestations(attestations[1], attestation)
            await userState.stop()
        })

        it('submit invalid airdrop proof event', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )

            const airdropProofInput = await userState.genUserSignUpProof(
                BigInt(attesterId)
            )
            airdropProofInput.publicSignals[1] = genRandomSalt().toString()
            const isValid = await airdropProofInput.verify()
            expect(isValid).to.be.false

            const tx = await unirepContract
                .connect(attester)
                .airdropEpochKey(
                    airdropProofInput.publicSignals,
                    airdropProofInput.proof,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = airdropProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(airdropProofInput.hash())
            )
            await userState.stop()
        })

        it('airdropEpochKey event should not update User state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
            await userState.stop()
        })

        it('submit attestations to the epoch key should update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
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

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
            await userState.stop()
        })

        it('submit valid sign up proof with wrong GST root event', async () => {
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const userStateTree = genNewUserStateTree()
            for (const attester of Object.keys(reputationRecords)) {
                userStateTree.update(
                    BigInt(attester),
                    reputationRecords[attester].hash()
                )
            }
            const config = await unirepContract.config()
            const GSTree = new IncrementalMerkleTree(
                config.globalStateTreeDepth
            )
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            const stateRoot = userStateTree.root
            const leafIndex = 0
            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            GSTree.insert(BigInt(hashedStateLeaf.toString()))

            const circuitInputs = genProveSignUpCircuitInput(
                id,
                epoch,
                GSTree,
                leafIndex,
                reputationRecords,
                BigInt(attesterId)
            )
            const { publicSignals, proof } =
                await defaultProver.genProofAndPublicSignals(
                    Circuit.proveUserSignUp,
                    circuitInputs
                )
            const formattedProof = new SignUpProof(
                publicSignals,
                proof,
                defaultProver
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester)
                .airdropEpochKey(
                    formattedProof.publicSignals,
                    formattedProof.proof,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = formattedProof.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(formattedProof.hash())
            )
        })

        it('airdropEpochKey event should not update User state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
            await userState.stop()
        })

        it('submit attestations to the epoch key should update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
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

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
            await userState.stop()
        })

        it('submit valid sign up proof event in wrong epoch should fail', async () => {
            const _id = new ZkIdentity()
            await unirepContract
                .connect(attester)
                .userSignUp(_id.genIdentityCommitment())
                .then((t) => t.wait())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                _id
            )

            const formattedProof = await userState.genUserSignUpProof(
                BigInt(attesterId)
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
                    .airdropEpochKey(
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
