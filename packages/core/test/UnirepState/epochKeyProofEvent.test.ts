// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { Unirep } from '@unirep/contracts'

import { UnirepProtocol, genUnirepState } from '../../src'
import {
    attesterSignUp,
    deploy,
    formatProofAndPublicSignals,
    genEpochKeyCircuitInput,
    genIdentity,
    genProof,
    genRandomAttestation,
    keccak256Hash,
    setAirdrop,
    verifyProof,
} from '../utils'
import { config } from '../testConfig'
import { CircuitName } from '../../src/types'

describe('Epoch key proof events in Unirep State', function () {
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
    const circuit = CircuitName.verifyEpochKey
    let GSTree = protocol.genNewGST()
    const rootHistories: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []

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

    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(0)

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

                const unirepState = await genUnirepState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(i + 1)

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

                const unirepState = await genUnirepState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(userNum + i + 1)

                const newUSTRoot = await protocol.computeInitUserStateRoot()
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })
    })

    describe('Epoch key proof event', async () => {
        let epochKey
        let proofIndex
        let epoch
        const userIdx = 1
        it('submit valid epoch key proof event', async () => {
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 0
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = genEpochKeyCircuitInput(
                protocol,
                userIds[userIdx],
                GSTree,
                userIdx,
                userStateTreeRoots[userIdx],
                epoch,
                epkNonce
            )
            const { proof, publicSignals } = await genProof(
                circuit,
                circuitInputs
            )

            // format proof and public signals
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )

            // verify proof
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.true

            const tx = await unirepContract.submitEpochKeyProof(input)
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )

            // submit the same proof twice should fail
            await expect(
                unirepContract.submitEpochKeyProof(input)
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
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

            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(1)
            expect(JSON.stringify(attestations[0])).to.equal(
                JSON.stringify(attestation)
            )
        })

        it('submit invalid epoch key proof event', async () => {
            const userIdx = Math.floor(Math.random() * maxUsers)
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const epkNonce = 1
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = genEpochKeyCircuitInput(
                protocol,
                userIds[userIdx],
                GSTree,
                userIdx,
                userStateTreeRoots[userIdx],
                epoch,
                epkNonce
            )
            circuitInputs.GST_root = genRandomSalt().toString()
            const { proof, publicSignals } = await genProof(
                circuit,
                circuitInputs
            )
            // format proof and public signals
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )

            // verify proof
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.false

            const tx = await unirepContract.submitEpochKeyProof(input)
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )
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

            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit valid epoch key proof with wrong GST root event', async () => {
            const GSTree = protocol.genNewGST()
            const { id, commitment } = genIdentity()
            const stateRoot = genRandomSalt()
            const leafIndex = 0

            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            GSTree.insert(BigInt(hashedStateLeaf.toString()))
            const epkNonce = 0
            const epoch = 1

            const circuitInputs = genEpochKeyCircuitInput(
                protocol,
                id,
                GSTree,
                leafIndex,
                stateRoot,
                epoch,
                epkNonce
            )
            const { proof, publicSignals } = await genProof(
                circuit,
                circuitInputs
            )
            // format proof and public signals
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )
            // verify proof
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.true

            const tx = await unirepContract.submitEpochKeyProof(input)
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = input.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(
                    keccak256Hash(circuit, input)
                )
            )
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

            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit valid epoch key proof event in wrong epoch', async () => {
            const userIdx = Math.floor(Math.random() * maxUsers)
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const wrongEpoch = epoch + 1
            const epkNonce = Math.floor(
                Math.random() * unirepState.config.numEpochKeyNoncePerEpoch
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = genEpochKeyCircuitInput(
                protocol,
                userIds[userIdx],
                GSTree,
                userIdx,
                userStateTreeRoots[userIdx],
                wrongEpoch,
                epkNonce
            )
            const { proof, publicSignals } = await genProof(
                circuit,
                circuitInputs
            )
            // format proof and public signals
            const input = formatProofAndPublicSignals(
                circuit,
                proof,
                publicSignals
            )

            // verify proof
            const isValid = await verifyProof(circuit, publicSignals, proof)
            expect(isValid).to.be.true

            await expect(
                unirepContract.submitEpochKeyProof(input)
            ).to.be.revertedWith(
                'Unirep: submit an epoch key proof with incorrect epoch'
            )
        })
    })
})
