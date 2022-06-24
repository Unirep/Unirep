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
import { Circuit, defaultProver } from '@unirep/circuits'
import {
    Attestation,
    deployUnirep,
    EpochKeyProof,
    ReputationProof,
    Unirep,
} from '@unirep/contracts'

import {
    genReputationNullifier,
    genUnirepState,
    genUserState,
    Reputation,
} from '../../src'
import {
    compareAttestations,
    genNewUserStateTree,
    genRandomAttestation,
    genReputationCircuitInput,
} from '../utils'

describe('Reputation proof events in Unirep User State', function () {
    this.timeout(0)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep

    let treeDepths
    let maxReputationBudget

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId
    const maxUsers = 10
    const userNum = 5
    const attestingFee = ethers.utils.parseEther('0.1')
    const airdropPosRep = 10
    const spendReputation = 4
    let fromProofIndex = 0

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
            attestingFee,
        })

        treeDepths = await unirepContract.treeDepths()
        maxReputationBudget = await unirepContract.maxReputationBudget()
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

        it('attester set airdrop amount', async () => {
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

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract
                    .connect(attester['acct'])
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract
                        .connect(attester['acct'])
                        .userSignUp(commitment)
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
                    attester['addr']
                )
                signUpAirdrops.push(
                    new Reputation(
                        airdroppedAmount.toBigInt(),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract.userSignUp(commitment)
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
            }
        })
    })

    describe('Reputation proof event', async () => {
        let epochKey
        let proofIndex
        let invalidProofIndex
        let epoch
        const userIdx = 2
        let repNullifier
        it('submit valid reputation proof event', async () => {
            const epkNonce = 0
            epoch = Number(await unirepContract.currentEpoch())
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const nonceList: BigInt[] = []
            for (let i = 0; i < spendReputation; i++) {
                nonceList.push(BigInt(i))
            }
            for (let i = spendReputation; i < maxReputationBudget; i++) {
                nonceList.push(BigInt(-1))
            }
            repNullifier = genReputationNullifier(
                userIds[userIdx].identityNullifier,
                epoch,
                0,
                attesterId
            )

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const { proof, publicSignals } =
                await userState.genProveReputationProof(
                    BigInt(attesterId),
                    epkNonce,
                    undefined,
                    undefined,
                    undefined,
                    nonceList
                )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester['acct'])
                .spendReputation(repProofInput, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = repProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(repProofInput.hash())
            )

            await expect(
                unirepContract
                    .connect(attester['acct'])
                    .spendReputation(repProofInput, {
                        value: attestingFee,
                    })
            ).to.be.revertedWithCustomError(
                unirepContract,
                'NullilierAlreadyUsed'
            )
        })

        it('spendReputation event should update User state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(1)

            // nullifiers should be added to unirepState
            expect(await userState.nullifierExist(repNullifier)).to.be.true
        })

        it('submit attestations to the epoch key should update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContract
                .connect(attester['acct'])
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
                userIds[userIdx]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
            compareAttestations(attestations[1], attestation)
        })

        it('submit valid reputation proof event with same nullifiers', async () => {
            const epkNonce = 1
            epoch = Number(await unirepContract.currentEpoch())
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const nonceList: BigInt[] = []
            for (let i = 0; i < spendReputation; i++) {
                nonceList.push(BigInt(i))
            }
            for (let i = spendReputation; i < maxReputationBudget; i++) {
                nonceList.push(BigInt(-1))
            }
            repNullifier = genReputationNullifier(
                userIds[userIdx].identityNullifier,
                epoch,
                0,
                attesterId
            )

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const { proof, publicSignals } =
                await userState.genProveReputationProof(
                    BigInt(attesterId),
                    epkNonce,
                    undefined,
                    undefined,
                    undefined,
                    nonceList
                )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester['acct'])
                .spendReputation(repProofInput, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = repProofInput.epochKey
            invalidProofIndex = await unirepContract.getProofIndex(
                repProofInput.hash()
            )
        })

        it('duplicated nullifier should not update User state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            const [epochKey] = await userState.getEpochKeys(currentEpoch)
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit attestations to the epoch key should not update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const epochKey = '0x01010101'
            const tx = await unirepContract
                .connect(attester['acct'])
                .submitAttestation(
                    attestation,
                    epochKey,
                    invalidProofIndex,
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
        })

        it('spend reputation event can attest to other epoch key and update User state', async () => {
            const otherUserIdx = 0
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[otherUserIdx]
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 0
            const { proof, publicSignals } =
                await userState.genVerifyEpochKeyProof(epkNonce)
            const epkProofInput = new EpochKeyProof(publicSignals, proof)
            const isValid = await epkProofInput.verify()
            expect(isValid).to.be.true

            let tx = await unirepContract.submitEpochKeyProof(epkProofInput)
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = epkProofInput.epochKey
            const toProofIndex = Number(
                await unirepContract.getProofIndex(epkProofInput.hash())
            )

            const attestation = new Attestation(
                BigInt(attesterId),
                BigInt(spendReputation),
                BigInt(0),
                BigInt(0),
                BigInt(0)
            )
            tx = await unirepContract
                .connect(attester['acct'])
                .submitAttestation(
                    attestation,
                    epochKey,
                    toProofIndex,
                    proofIndex,
                    { value: attestingFee }
                )
            receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userStateAfterAttest = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[otherUserIdx]
            )
            const attestations = await userStateAfterAttest.getAttestations(
                epochKey
            )
            expect(attestations.length).equal(1)
            compareAttestations(attestations[0], attestation)
        })

        it('submit invalid reputation proof event', async () => {
            const epkNonce = 1
            const spendReputation = Math.ceil(
                Math.random() * maxReputationBudget
            )
            epoch = Number(await unirepContract.currentEpoch())
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            const GSTree = await userState.genGSTree(epoch)
            const circuitInputs = genReputationCircuitInput(
                userIds[userIdx],
                epoch,
                epkNonce,
                GSTree,
                userIdx,
                reputationRecords,
                Number(attesterId),
                spendReputation
            )
            circuitInputs.GST_root = genRandomSalt().toString()
            const { proof, publicSignals } =
                await defaultProver.genProofAndPublicSignals(
                    Circuit.proveReputation,
                    circuitInputs
                )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.false

            const tx = await unirepContract
                .connect(attester['acct'])
                .spendReputation(repProofInput, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = repProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(repProofInput.hash())
            )
        })

        it('spendReputation event should not update User state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit attestations to the epoch key should not update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const epochKey = '0x01010101'
            const tx = await unirepContract
                .connect(attester['acct'])
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
                userIds[userIdx]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        // it('invalid reputation proof with from proof index should not update User state', async () => {
        //     const otherUserIdx = 0
        //     const userState = await genUserState(
        //         hardhatEthers.provider,
        //         unirepContract.address,
        //         userIds[otherUserIdx]
        //     )
        //     epoch = Number(await unirepContract.currentEpoch())
        //     const epkNonce = 0
        //     const { proof, publicSignals } =
        //         await userState.genVerifyEpochKeyProof(epkNonce)
        //     const epkProofInput = new EpochKeyProof(publicSignals, proof)
        //     const isValid = await epkProofInput.verify()
        //     expect(isValid).to.be.true
        //
        //     let tx = await unirepContract.submitEpochKeyProof(epkProofInput)
        //     let receipt = await tx.wait()
        //     expect(receipt.status).to.equal(1)
        //
        //     epochKey = epkProofInput.epochKey
        //     const toProofIndex = Number(
        //         await unirepContract.getProofIndex(epkProofInput.hash())
        //     )
        //
        //     const attestation = genRandomAttestation()
        //     attestation.attesterId = attesterId
        //     tx = await unirepContract
        //         .connect(attester['acct'])
        //         .submitAttestation(
        //             attestation,
        //             epochKey,
        //             toProofIndex,
        //             proofIndex,
        //             { value: attestingFee }
        //         )
        //     receipt = await tx.wait()
        //     expect(receipt.status).to.equal(1)
        //
        //     const userStateAfterAttest = await genUserState(
        //         hardhatEthers.provider,
        //         unirepContract.address,
        //         userIds[otherUserIdx]
        //     )
        //     expect(userState.toJSON()).to.deep.equal(
        //         userStateAfterAttest.toJSON()
        //     )
        // })

        it('submit valid reputation proof with wrong GST root event', async () => {
            const epkNonce = 1
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const userStateTree = genNewUserStateTree()
            for (const attester of Object.keys(reputationRecords)) {
                await userStateTree.update(
                    BigInt(attester),
                    reputationRecords[attester].hash()
                )
            }
            const GSTree = new IncrementalMerkleTree(
                treeDepths.globalStateTreeDepth
            )
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            const stateRoot = userStateTree.root
            const leafIndex = 0
            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            GSTree.insert(BigInt(hashedStateLeaf.toString()))

            const circuitInputs = genReputationCircuitInput(
                id,
                epoch,
                epkNonce,
                GSTree,
                leafIndex,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } =
                await defaultProver.genProofAndPublicSignals(
                    Circuit.proveReputation,
                    circuitInputs
                )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester['acct'])
                .spendReputation(repProofInput, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = repProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(repProofInput.hash())
            )
        })

        it('spendReputation event should not update Unirep state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const attestations = await userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContract
                .connect(attester['acct'])
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
        })

        it('submit valid reputation proof event in wrong epoch should fail', async () => {
            const epkNonce = 1
            const spendReputation = Math.floor(
                Math.random() * maxReputationBudget
            )
            const wrongEpoch = epoch + 1
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            const GSTree = await userState.genGSTree(epoch)
            const circuitInputs = genReputationCircuitInput(
                userIds[userIdx],
                wrongEpoch,
                epkNonce,
                GSTree,
                userIdx,
                reputationRecords,
                Number(attesterId),
                spendReputation
            )
            const { proof, publicSignals } =
                await defaultProver.genProofAndPublicSignals(
                    Circuit.proveReputation,
                    circuitInputs
                )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.true

            await expect(
                unirepContract
                    .connect(attester['acct'])
                    .spendReputation(repProofInput, {
                        value: attestingFee,
                    })
            ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
        })
    })
})
