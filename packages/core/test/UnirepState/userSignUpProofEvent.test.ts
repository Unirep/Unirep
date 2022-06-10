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
import { Circuit, genProofAndPublicSignals } from '@unirep/circuits'
import { deployUnirep, SignUpProof, Unirep } from '@unirep/contracts'

import { computeInitUserStateRoot, genUnirepState, Reputation } from '../../src'
import {
    genNewGST,
    genNewUserStateTree,
    genProveSignUpCircuitInput,
    genRandomAttestation,
} from '../utils'
import { GLOBAL_STATE_TREE_DEPTH } from '@unirep/circuits/config'

describe('User sign up proof (Airdrop proof) events in Unirep State', function () {
    this.timeout(0)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep
    let unirepContractCalledByAttester: Unirep
    let treeDepths
    let GSTree: IncrementalMerkleTree
    const rootHistories: BigInt[] = []

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    const attestingFee = ethers.utils.parseEther('0.1')
    const fromProofIndex = 0

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
            attestingFee,
        })
        treeDepths = await unirepContract.treeDepths()
        GSTree = genNewGST(
            treeDepths.globalStateTreeDepth,
            treeDepths.userStateTreeDepth
        )
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
            const airdropPosRep = 10
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

    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(0)

            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = genNewGST(
                treeDepths.globalStateTreeDepth,
                treeDepths.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
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
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const unirepStateBefore = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepEpoch = unirepStateBefore.currentEpoch
            const unirepGSTLeavesBefore =
                unirepStateBefore.getNumGSTLeaves(unirepEpoch)

            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            await expect(
                unirepContract.userSignUp(commitment)
            ).to.be.revertedWith(
                'Unirep: maximum number of user signups reached'
            )

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(unirepGSTLeavesBefore)
        })

        it('Check GST roots match Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(
                    root,
                    unirepState.currentEpoch
                )
                expect(exist).to.be.true
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
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]

            const circuitInputs = await genProveSignUpCircuitInput(
                userIds[userIdx],
                epoch,
                GSTree,
                userIdx,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveUserSignUp,
                circuitInputs
            )
            const airdropProofInput = new SignUpProof(publicSignals, proof)
            const isValid = await airdropProofInput.verify()
            expect(isValid).to.be.true

            const tx = await unirepContractCalledByAttester.airdropEpochKey(
                airdropProofInput,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = airdropProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(airdropProofInput.hash())
            )

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(
                    airdropProofInput,
                    {
                        value: attestingFee,
                    }
                )
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('airdropEpochKey event should update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(1)
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

        it('submit invalid airdrop proof event', async () => {
            epoch = Number(await unirepContract.currentEpoch())
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]

            const circuitInputs = await genProveSignUpCircuitInput(
                userIds[userIdx],
                epoch,
                GSTree,
                userIdx,
                reputationRecords,
                BigInt(attesterId)
            )
            circuitInputs.GST_root = genRandomSalt().toString()
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveUserSignUp,
                circuitInputs
            )
            const airdropProofInput = new SignUpProof(publicSignals, proof)
            const isValid = await airdropProofInput.verify()
            expect(isValid).to.be.false

            const tx = await unirepContractCalledByAttester.airdropEpochKey(
                airdropProofInput,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = airdropProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(airdropProofInput.hash())
            )
        })

        it('airdropEpochKey event should not update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(2)
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
        })

        it('submit valid sign up proof with wrong GST root event', async () => {
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
            const userStateTree = genNewUserStateTree()
            for (const attester of Object.keys(reputationRecords)) {
                await userStateTree.update(
                    BigInt(attester),
                    reputationRecords[attester].hash()
                )
            }
            const GSTree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            const stateRoot = userStateTree.root
            const leafIndex = 0
            const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
            GSTree.insert(BigInt(hashedStateLeaf.toString()))

            const circuitInputs = await genProveSignUpCircuitInput(
                id,
                epoch,
                GSTree,
                leafIndex,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveUserSignUp,
                circuitInputs
            )
            const airdropProofInput = new SignUpProof(publicSignals, proof)
            const isValid = await airdropProofInput.verify()
            expect(isValid).to.be.true

            const tx = await unirepContractCalledByAttester.airdropEpochKey(
                airdropProofInput,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = airdropProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(airdropProofInput.hash())
            )
        })

        it('airdropEpochKey event should not update Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
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
            expect(attestations.length).equal(0)
        })

        it('submit valid sign up proof event in wrong epoch should fail', async () => {
            const wrongEpoch = epoch + 1
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const reputationRecords = {}
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]

            const circuitInputs = await genProveSignUpCircuitInput(
                userIds[userIdx],
                wrongEpoch,
                GSTree,
                userIdx,
                reputationRecords,
                BigInt(attesterId)
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.proveUserSignUp,
                circuitInputs
            )
            const airdropProofInput = new SignUpProof(publicSignals, proof)
            const isValid = await airdropProofInput.verify()
            expect(isValid).to.be.true

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(
                    airdropProofInput,
                    {
                        value: attestingFee,
                    }
                )
            ).to.be.revertedWith(
                'Unirep: submit an airdrop proof with incorrect epoch'
            )
        })
    })
})
