// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt, hashLeftRight } from '@unirep/crypto'
import { Unirep } from '@unirep/contracts'

import {
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
    genProveSignUpCircuitInput,
    genRandomAttestation,
    keccak256Hash,
    setAirdrop,
    verifyProof,
} from '../utils'
import { config, zkFilesPath } from '../testConfig'
import { CircuitName } from '../../src/types'

describe('User sign up proof (Airdrop proof) events in Unirep User State', function () {
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
    const userNum = Math.ceil(Math.random() * maxUsers)
    const attestingFee = ethers.utils.parseEther('0.1')
    const fromProofIndex = 0

    // global variables
    const circuit = CircuitName.proveUserSignUp
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []
    let GSTree = protocol.genNewGST()
    const rootHistories: BigInt[] = []

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
            const airdropPosRep = 10
            await setAirdrop(unirepContract, attester, airdropPosRep)
        })
    })

    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const id = new ZkIdentity()
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

    describe('Airdrop proof event', async () => {
        let epochKey
        let proofIndex
        let epoch
        const userIdx = 3
        it('submit airdrop proof event', async () => {
            epoch = Number(await unirepContract.currentEpoch())
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )

            const circuitInputs = await userState.genCircuitInputs(circuit, {
                attesterId: BigInt(attesterId),
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
                .airdropEpochKey(input, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )

            await expect(
                unirepContract.connect(attester).airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('airdropEpochKey event should update Unirep state', async () => {
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(1)
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
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
            expect(JSON.stringify(attestations[1])).to.equal(
                JSON.stringify(attestation)
            )
        })

        it('submit invalid airdrop proof event', async () => {
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[userIdx]
            )

            const circuitInputs = await userState.genCircuitInputs(circuit, {
                attesterId: BigInt(attesterId),
            })

            const { proof, publicSignals } = await genProof(
                circuit,
                circuitInputs
            )

            publicSignals[2] = genRandomSalt().toString()
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )

            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.false

            const tx = await unirepContract
                .connect(attester)
                .airdropEpochKey(input, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )
        })

        it('airdropEpochKey event should not update User state', async () => {
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
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
                userIds[0]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
        })

        it('submit valid sign up proof with wrong GST root event', async () => {
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

            const circuitInputs = await genProveSignUpCircuitInput(
                protocol,
                id,
                epoch,
                GSTree,
                leafIndex,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } = await genProof(
                CircuitName.proveUserSignUp,
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
                .airdropEpochKey(input, { value: attestingFee })
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )
        })

        it('airdropEpochKey event should not update User state', async () => {
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
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
                userIds[0]
            )
            const attestations = userState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit valid sign up proof event in wrong epoch should fail', async () => {
            const wrongEpoch = epoch + 1
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]

            const circuitInputs = await genProveSignUpCircuitInput(
                protocol,
                userIds[userIdx],
                wrongEpoch,
                GSTree,
                userIdx,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } = await genProof(
                CircuitName.proveUserSignUp,
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
                unirepContract.connect(attester).airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith(
                'Unirep: submit an airdrop proof with incorrect epoch'
            )
        })
    })
})
