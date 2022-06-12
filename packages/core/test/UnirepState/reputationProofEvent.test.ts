// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomNumber,
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
import { MAX_REPUTATION_BUDGET } from '@unirep/circuits/config'

import {
    computeInitUserStateRoot,
    genReputationNullifier,
    genUnirepState,
    Reputation,
} from '../../src'
import {
    genEpochKeyCircuitInput,
    genNewUserStateTree,
    genRandomAttestation,
    genReputationCircuitInput,
} from '../utils'

describe('Reputation proof events in Unirep State', function () {
    this.timeout(0)

    let userIds: ZkIdentity[] = []
    let userCommitments: bigint[] = []
    let userStateTreeRoots: bigint[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep
    let unirepContractCalledByAttester: Unirep
    let treeDepths: any

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

                const unirepState = await genUnirepState(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(i + 1)

                const attesterId = await unirepContract.attesters(
                    attester['addr']
                )
                const airdroppedAmount = await unirepContract.airdropAmount(
                    attester['addr']
                )
                const newUSTRoot = await computeInitUserStateRoot(
                    treeDepths.userStateTreeDepth,
                    Number(attesterId),
                    Number(airdroppedAmount)
                )
                userStateTreeRoots.push(newUSTRoot)
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

                const unirepState = await genUnirepState(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(userNum + i + 1)

                const newUSTRoot = await computeInitUserStateRoot(
                    treeDepths.userStateTreeDepth
                )
                userStateTreeRoots.push(newUSTRoot)
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
            repNullifier = genReputationNullifier(
                userIds[userIdx].identityNullifier,
                epoch,
                0,
                attesterId
            )

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

            await expect(
                unirepContractCalledByAttester.spendReputation(repProofInput, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('spendReputation event should update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(1)

            // nullifiers should be added to unirepState
            expect(unirepState.nullifierExist(repNullifier)).to.be.true
        })

        it('submit attestations to the epoch key should update Unirep state', async () => {
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

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
            expect(JSON.stringify(attestations[1])).to.equal(
                JSON.stringify(attestation)
            )
        })

        it('spend reputation event can attest to other epoch key and update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 0
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const otherUserIdx = 0
            const circuitInputs = genEpochKeyCircuitInput(
                userIds[otherUserIdx],
                GSTree,
                otherUserIdx,
                userStateTreeRoots[otherUserIdx],
                epoch,
                epkNonce
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                circuitInputs
            )
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

            const unirepStateAfterAttest = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations =
                unirepStateAfterAttest.getAttestations(epochKey)
            expect(attestations.length).equal(1)
            expect(JSON.stringify(attestations[0])).to.equal(
                JSON.stringify(attestation)
            )
        })

        it('submit valid reputation proof event with same nullifiers', async () => {
            const epkNonce = 1
            epoch = Number(await unirepContract.currentEpoch())
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            repNullifier = genReputationNullifier(
                userIds[userIdx].identityNullifier,
                epoch,
                0,
                attesterId
            )

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
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveReputation,
                circuitInputs
            )
            expect(publicSignals[0]).equal(repNullifier.toString())
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

        it('duplicated nullifier should not update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
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

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit invalid reputation proof event', async () => {
            const epkNonce = 1
            const spendReputation = Math.ceil(
                Math.random() * MAX_REPUTATION_BUDGET
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
            circuitInputs.GST_root = genRandomNumber().toString()
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

        it('spendReputation event should not update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
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

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('invalid reputation proof with from proof index should not update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 0
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const otherUserIdx = 0
            const circuitInputs = genEpochKeyCircuitInput(
                userIds[otherUserIdx],
                GSTree,
                otherUserIdx,
                userStateTreeRoots[otherUserIdx],
                epoch,
                epkNonce
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                circuitInputs
            )
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

            const unirepStateAfterAttest = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepState.toJSON()).to.deep.equal(
                unirepStateAfterAttest.toJSON()
            )
        })

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
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
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

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit valid reputation proof event in wrong epoch should fail', async () => {
            const epkNonce = 1
            const spendReputation = Math.floor(
                Math.random() * MAX_REPUTATION_BUDGET
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
