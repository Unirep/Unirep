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
import { Circuit, genProofAndPublicSignals } from '@unirep/circuits'
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
    let unirepContractCalledByAttester: Unirep
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
            unirepContractCalledByAttester = unirepContract.connect(
                attester['acct']
            )
            let tx = await unirepContractCalledByAttester.attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = await unirepContract.attesters(attester['addr'])
        })

        it('attester set airdrop amount', async () => {
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

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContractCalledByAttester.userSignUp(
                    commitment
                )
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContractCalledByAttester.userSignUp(commitment)
                ).to.be.revertedWith('Unirep: the user has already signed up')

                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = userState.getUnirepStateCurrentEpoch()
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
                const unirepEpoch = userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                signUpAirdrops.push(Reputation.default())
            }
        })
    })

    describe('Reputation proof event', async () => {
        let epochKey
        let proofIndex
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

            const tx = await unirepContractCalledByAttester.spendReputation(
                repProofInput,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = repProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(repProofInput.hash())
            )

            await expect(
                unirepContractCalledByAttester.spendReputation(repProofInput, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('spendReputation event should update User state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(1)

            // nullifiers should be added to unirepState
            expect(userState.nullifierExist(repNullifier)).to.be.true
        })

        it('submit attestations to the epoch key should update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContractCalledByAttester.submitAttestation(
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
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
            expect(JSON.stringify(attestations[1])).to.equal(
                JSON.stringify(attestation)
            )
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

            const tx = await unirepContractCalledByAttester.spendReputation(
                repProofInput,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = repProofInput.epochKey
        })

        it('duplicated nullifier should not update User state', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit attestations to the epoch key should not update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContractCalledByAttester.submitAttestation(
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
            const attestations = userState.getAttestations(epochKey)
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
            tx = await unirepContractCalledByAttester.submitAttestation(
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
            const attestations = userStateAfterAttest.getAttestations(epochKey)
            expect(attestations.length).equal(1)
            expect(JSON.stringify(attestations[0])).to.equal(
                JSON.stringify(attestation)
            )
        })

        it('submit invalid reputation proof event', async () => {
            const epkNonce = 1
            const spendReputation = Math.ceil(
                Math.random() * maxReputationBudget
            )
            epoch = Number(await unirepContract.currentEpoch())
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = await genReputationCircuitInput(
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
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveReputation,
                circuitInputs
            )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.false

            const tx = await unirepContractCalledByAttester.spendReputation(
                repProofInput,
                { value: attestingFee }
            )
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
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit attestations to the epoch key should not update User state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContractCalledByAttester.submitAttestation(
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
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('invalid reputation proof with from proof index should not update User state', async () => {
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

            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            tx = await unirepContractCalledByAttester.submitAttestation(
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
            expect(userState.toJSON()).to.deep.equal(
                userStateAfterAttest.toJSON()
            )
        })

        it('submit valid reputation proof with wrong GST root event', async () => {
            const epkNonce = 1
            const ZERO_VALUE = 0
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const userStateTree = await genNewUserStateTree()
            for (const attester of Object.keys(reputationRecords)) {
                await userStateTree.update(
                    BigInt(attester),
                    reputationRecords[attester].hash()
                )
            }
            const GSTree = new IncrementalMerkleTree(
                treeDepths.globalStateTreeDepth,
                ZERO_VALUE,
                2
            )
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            const stateRoot = userStateTree.getRootHash()
            const leafIndex = 0
            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            GSTree.insert(BigInt(hashedStateLeaf.toString()))

            const circuitInputs = await genReputationCircuitInput(
                id,
                epoch,
                epkNonce,
                GSTree,
                leafIndex,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveReputation,
                circuitInputs
            )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.true

            const tx = await unirepContractCalledByAttester.spendReputation(
                repProofInput,
                { value: attestingFee }
            )
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
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            const tx = await unirepContractCalledByAttester.submitAttestation(
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
            const attestations = userState.getAttestations(epochKey)
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
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = await genReputationCircuitInput(
                userIds[userIdx],
                wrongEpoch,
                epkNonce,
                GSTree,
                userIdx,
                reputationRecords,
                Number(attesterId),
                spendReputation
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveReputation,
                circuitInputs
            )
            const repProofInput = new ReputationProof(publicSignals, proof)
            const isValid = await repProofInput.verify()
            expect(isValid).to.be.true

            await expect(
                unirepContractCalledByAttester.spendReputation(repProofInput, {
                    value: attestingFee,
                })
            ).to.be.revertedWith(
                'Unirep: submit a reputation proof with incorrect epoch'
            )
        })
    })
})
