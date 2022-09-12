// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    ZkIdentity,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { EpochKeyProof, Unirep } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/'

import { computeInitUserStateRoot, genEpochKey, Reputation } from '../../src'
import {
    compareAttestations,
    genEpochKeyCircuitInput,
    genRandomAttestation,
    genUserState,
} from '../utils'

describe('Epoch key proof events in Unirep User State', function () {
    this.timeout(0)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId
    const maxUsers = 100
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
            attestingFee,
        })
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()

            let tx = await unirepContract
                .connect(attester['acct'])
                .attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = await unirepContract.attesters(attester['addr'])
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const airdropAmount = 100

                const tx = await unirepContract
                    .connect(attester['acct'])
                    ['userSignUp(uint256,uint256)'](commitment, airdropAmount)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract
                        .connect(attester['acct'])
                        ['userSignUp(uint256,uint256)'](
                            commitment,
                            airdropAmount
                        )
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

                const attesterId = await unirepContract.attesters(
                    attester['addr']
                )
                const newUSTRoot = computeInitUserStateRoot(
                    userState.settings.userStateTreeDepth,
                    Number(attesterId),
                    Number(airdropAmount)
                )
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(
                    new Reputation(
                        BigInt(airdropAmount),
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

                const tx = await unirepContract['userSignUp(uint256)'](
                    commitment
                )
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

                const newUSTRoot = computeInitUserStateRoot(
                    userState.settings.userStateTreeDepth
                )
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                await userState.stop()
            }
        })
    })

    describe('Epoch key proof', async () => {
        let epochKey
        let epoch
        const userIdx = 1
        it('valid epoch key proof should not throw error', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 0
            const formattedProof = await userState.genVerifyEpochKeyProof(
                epkNonce
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            await unirepContract.assertValidEpochKeyProof(
                formattedProof.publicSignals,
                formattedProof.proof
            )
            epochKey = formattedProof.epochKey
        })

        it('submit attestations to the epoch key should update Unirep state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContract
                .connect(attester['acct'])
                .submitAttestation(attestation, epochKey, {
                    value: attestingFee,
                })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(1)
            compareAttestations(attestations[0], attestation)
            await userState.stop()
        })

        it('submit invalid epoch key proof event', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 1
            const formattedProof = await userState.genVerifyEpochKeyProof(
                epkNonce
            )
            formattedProof.publicSignals[formattedProof.idx.epochKey] =
                genEpochKey(genRandomSalt(), epoch, epkNonce).toString()
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.false

            await expect(
                unirepContract.assertValidEpochKeyProof(
                    formattedProof.publicSignals,
                    formattedProof.proof
                )
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')

            epochKey = formattedProof.epochKey
            await userState.stop()
        })

        it('submit valid epoch key proof with wrong GST root event', async () => {
            const config = await unirepContract.config()
            const GSTree = new IncrementalMerkleTree(
                config.globalStateTreeDepth
            )
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            const stateRoot = genRandomSalt()
            const leafIndex = 0

            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            GSTree.insert(BigInt(hashedStateLeaf.toString()))
            const epkNonce = 0
            const epoch = 1

            const circuitInputs = genEpochKeyCircuitInput(
                id,
                GSTree,
                leafIndex,
                stateRoot,
                epoch,
                epkNonce
            )
            const { publicSignals, proof } =
                await defaultProver.genProofAndPublicSignals(
                    Circuit.verifyEpochKey,
                    circuitInputs
                )
            const formattedProof = new EpochKeyProof(
                publicSignals,
                proof,
                defaultProver
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            await expect(
                unirepContract.assertValidEpochKeyProof(
                    formattedProof.publicSignals,
                    formattedProof.proof
                )
            ).to.be.revertedWithCustomError(
                unirepContract,
                'InvalidGlobalStateTreeRoot'
            )
        })

        it('submit valid epoch key proof event in wrong epoch', async () => {
            const unirepState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            const wrongEpoch = epoch + 1
            const epkNonce = 1
            const GSTree = await unirepState.genGSTree(epoch)
            const circuitInputs = genEpochKeyCircuitInput(
                userIds[userIdx],
                GSTree,
                userIdx,
                userStateTreeRoots[userIdx],
                wrongEpoch,
                epkNonce
            )

            const { publicSignals, proof } =
                await defaultProver.genProofAndPublicSignals(
                    Circuit.verifyEpochKey,
                    circuitInputs
                )
            const formattedProof = new EpochKeyProof(
                publicSignals,
                proof,
                defaultProver
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            await expect(
                unirepContract.assertValidEpochKeyProof(
                    formattedProof.publicSignals,
                    formattedProof.proof
                )
            ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
        })
    })
})
