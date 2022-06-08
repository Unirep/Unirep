// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { Unirep } from '@unirep/contracts'

import {
    Attestation,
    genUnirepState,
    genUserState,
    Reputation,
    UnirepProtocol,
} from '../../src'
import {
    attesterSignUp,
    deploy,
    formatProofAndPublicSignals,
    genIdentity,
    genProof,
    genRandomAttestation,
    genReputationCircuitInput,
    keccak256Hash,
    setAirdrop,
    verifyProof,
} from '../utils'
import { config, zkFilesPath } from '../testConfig'
import { CircuitName } from '../../src/types'

describe('Reputation proof events in Unirep User State', function () {
    this.timeout(0)
    // attesters
    let accounts: ethers.Signer[]
    let attester, attesterAddr
    let attesterId

    // users
    let userIds: ZkIdentity[] = []

    // unirep contract and protocol
    const protocol = new UnirepProtocol(config)
    let unirepContract: Unirep

    // test config
    const maxUsers = 10
    const userNum = 5
    const attestingFee = ethers.utils.parseEther('0.1')
    const airdropPosRep = 10
    const spendReputation = 4
    let fromProofIndex = 0

    // global variables
    const circuit = CircuitName.proveReputation
    let GSTree = protocol.genNewGST()
    const rootHistories: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], config)
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester = accounts[2]
            const success = await attesterSignUp(unirepContract, attester)
            expect(success, 'Attester signs up failed').to.equal(1)
            attesterAddr = await attester.getAddress()
            attesterId = await unirepContract.attesters(attesterAddr)
        })

        it('attester set airdrop amount', async () => {
            await setAirdrop(unirepContract, attester, airdropPosRep)
        })
    })

    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const { id } = genIdentity()
            const initUnirepState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = protocol.genNewGST()
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const { id, commitment } = genIdentity()
                userIds.push(id)

                const tx = await unirepContract
                    .connect(attester)
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract.connect(attester).userSignUp(commitment)
                ).to.be.revertedWith('Unirep: the user has already signed up')

                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = userState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const attesterId = await unirepContract.attesters(attesterAddr)
                const airdroppedAmount = await unirepContract.airdropAmount(
                    attesterAddr
                )
                const newUSTRoot = await protocol.computeInitUserStateRoot(
                    Number(attesterId),
                    Number(airdroppedAmount)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(
                    new Reputation(
                        airdroppedAmount.toBigInt(),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const { id, commitment } = genIdentity()
                userIds.push(id)

                const tx = await unirepContract.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = userState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const newUSTRoot = await protocol.computeInitUserStateRoot()
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
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
            for (
                let i = spendReputation;
                i < protocol.config.maxReputationBudget;
                i++
            ) {
                nonceList.push(BigInt(-1))
            }
            repNullifier = UnirepProtocol.genReputationNullifier(
                userIds[userIdx].identityNullifier,
                epoch,
                0,
                attesterId
            )

            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const circuitInputs = await userState.genCircuitInputs(circuit, {
                attesterId: BigInt(attesterId),
                epkNonce,
                minRep: undefined,
                proveGraffiti: undefined,
                graffitiPreImage: undefined,
                nonceList: nonceList,
            })
            const { proof, publicSignals } = await genProof(
                circuit,
                circuitInputs
            )
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester)
                .spendReputation(input, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )

            await expect(
                unirepContract.connect(attester).spendReputation(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('spendReputation event should update User state', async () => {
            const userState = await genUserState(
                protocol,
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
                protocol,
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
            for (
                let i = spendReputation;
                i < protocol.config.maxReputationBudget;
                i++
            ) {
                nonceList.push(BigInt(-1))
            }
            repNullifier = UnirepProtocol.genReputationNullifier(
                userIds[userIdx].identityNullifier,
                epoch,
                0,
                attesterId
            )

            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )
            const circuitInputs = await userState.genCircuitInputs(circuit, {
                attesterId: BigInt(attesterId),
                epkNonce,
                minRep: undefined,
                proveGraffiti: undefined,
                graffitiPreImage: undefined,
                nonceList,
            })
            const { proof, publicSignals } = await genProof(
                circuit,
                circuitInputs
            )
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester)
                .spendReputation(input, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
        })

        it('duplicated nullifier should not update User state', async () => {
            const userState = await genUserState(
                protocol,
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
                protocol,
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
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[otherUserIdx]
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epochKeyNonce = 0
            const circuitInputs = await userState.genCircuitInputs(
                CircuitName.verifyEpochKey,
                { epochKeyNonce }
            )
            const { proof, publicSignals } = await genProof(
                CircuitName.verifyEpochKey,
                circuitInputs
            )
            const epkProofInput = formatProofAndPublicSignals(
                CircuitName.verifyEpochKey,
                proof,
                publicSignals
            )
            const isValid = await verifyProof(
                CircuitName.verifyEpochKey,
                publicSignals,
                proof
            )
            expect(isValid).to.be.true

            let tx = await unirepContract.submitEpochKeyProof(epkProofInput)
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = epkProofInput.epochKey
            const toProofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(CircuitName.verifyEpochKey, epkProofInput)
                )
            )

            const attestation = new Attestation({
                attesterId,
                posRep: spendReputation,
                negRep: 0,
                graffiti: 0,
                signUp: 0,
            })
            tx = await unirepContract
                .connect(attester)
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
                protocol,
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
                Math.random() * protocol.config.maxReputationBudget
            )
            epoch = Number(await unirepContract.currentEpoch())
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = await genReputationCircuitInput(
                protocol,
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
            const { proof, publicSignals } = await genProof(
                CircuitName.proveReputation,
                circuitInputs
            )
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.false

            const tx = await unirepContract
                .connect(attester)
                .spendReputation(input, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )
        })

        it('spendReputation event should not update User state', async () => {
            const userState = await genUserState(
                protocol,
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
                protocol,
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
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[otherUserIdx]
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epochKeyNonce = 0
            const circuitInputs = await userState.genCircuitInputs(
                CircuitName.verifyEpochKey,
                { epochKeyNonce }
            )
            const { proof, publicSignals } = await genProof(
                CircuitName.verifyEpochKey,
                circuitInputs
            )
            const epkProofInput = formatProofAndPublicSignals(
                CircuitName.verifyEpochKey,
                proof,
                publicSignals
            )
            const isValid = await verifyProof(
                CircuitName.verifyEpochKey,
                publicSignals,
                proof
            )
            expect(isValid).to.be.true

            let tx = await unirepContract.submitEpochKeyProof(epkProofInput)
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = epkProofInput.epochKey
            const toProofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(CircuitName.verifyEpochKey, epkProofInput)
                )
            )

            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            tx = await unirepContract
                .connect(attester)
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
                protocol,
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
            const userStateTree = await protocol.genNewUST()
            for (const attester of Object.keys(reputationRecords)) {
                await userStateTree.update(
                    BigInt(attester),
                    reputationRecords[attester].hash()
                )
            }
            const GSTree = protocol.genNewGST()
            const { id, commitment } = genIdentity()
            const stateRoot = userStateTree.root
            const leafIndex = 0
            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            GSTree.insert(BigInt(hashedStateLeaf.toString()))

            const circuitInputs = await genReputationCircuitInput(
                protocol,
                id,
                epoch,
                epkNonce,
                GSTree,
                leafIndex,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } = await genProof(
                CircuitName.proveReputation,
                circuitInputs
            )
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.true

            const tx = await unirepContract
                .connect(attester)
                .spendReputation(input, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )
        })

        it('spendReputation event should not update Unirep state', async () => {
            const userState = await genUserState(
                protocol,
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
                protocol,
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
                Math.random() * protocol.config.maxReputationBudget
            )
            const wrongEpoch = epoch + 1
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = await genReputationCircuitInput(
                protocol,
                userIds[userIdx],
                wrongEpoch,
                epkNonce,
                GSTree,
                userIdx,
                reputationRecords,
                Number(attesterId),
                spendReputation
            )
            const { proof, publicSignals } = await genProof(
                CircuitName.proveReputation,
                circuitInputs
            )
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.true

            await expect(
                unirepContract.connect(attester).spendReputation(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith(
                'Unirep: submit a reputation proof with incorrect epoch'
            )
        })
    })
})
