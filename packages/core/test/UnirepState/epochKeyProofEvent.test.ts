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
import { deployUnirep, EpochKeyProof } from '@unirep/contracts'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '@unirep/config'
import {
    computeInitUserStateRoot,
    genUnirepStateFromContract,
    Reputation,
    UserState,
} from '../../src'
import {
    genEpochKeyCircuitInput,
    genNewGST,
    genRandomAttestation,
} from '../utils'
import { Unirep } from '@unirep/contracts'

describe('Epoch key proof events in Unirep State', function () {
    this.timeout(0)

    let users: UserState[] = new Array(2)
    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []

    let unirepContract: Unirep
    let unirepContractCalledByAttester: Unirep
    let _treeDepths: any
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
        _treeDepths = await unirepContract.treeDepths()
        GSTree = genNewGST(
            _treeDepths.globalStateTreeDepth,
            _treeDepths.userStateTreeDepth
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
            const initUnirepState = await genUnirepStateFromContract(
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
                _treeDepths.globalStateTreeDepth,
                _treeDepths.userStateTreeDepth
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

                const unirepState = await genUnirepStateFromContract(
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
                    _treeDepths.userStateTreeDepth,
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

                const unirepState = await genUnirepStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(userNum + i + 1)

                const newUSTRoot = await computeInitUserStateRoot(
                    _treeDepths.userStateTreeDepth
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const unirepStateBefore = await genUnirepStateFromContract(
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

            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(unirepGSTLeavesBefore)
        })

        it('Check GST roots match Unirep state', async () => {
            const unirepState = await genUnirepStateFromContract(
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

    describe('Epoch key proof event', async () => {
        let epochKey
        let proofIndex
        let epoch
        const userIdx = 1
        it('submit valid epoch key proof event', async () => {
            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 0
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = genEpochKeyCircuitInput(
                userIds[userIdx],
                GSTree,
                userIdx,
                userStateTreeRoots[userIdx],
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

            const tx = await unirepContract.submitEpochKeyProof(epkProofInput)
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = epkProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(epkProofInput.hash())
            )

            // submit the same proof twice should fail
            await expect(
                unirepContract.submitEpochKeyProof(epkProofInput)
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('submit attestations to the epoch key should update Unirep state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = BigInt(attesterId)
            const tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey,
                proofIndex,
                fromProofIndex,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(1)
            expect(attestations[0].toJSON()).equal(attestation.toJSON())
        })

        it('submit invalid epoch key proof event', async () => {
            const userIdx = Math.floor(Math.random() * users.length)
            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const epkNonce = 1
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = genEpochKeyCircuitInput(
                userIds[userIdx],
                GSTree,
                userIdx,
                userStateTreeRoots[userIdx],
                epoch,
                epkNonce
            )
            circuitInputs.GST_root = genRandomSalt().toString()
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            const epkProofInput = new EpochKeyProof(publicSignals, proof)
            const isValid = await epkProofInput.verify()
            expect(isValid).to.be.false

            const tx = await unirepContract.submitEpochKeyProof(epkProofInput)
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = epkProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(epkProofInput.hash())
            )
        })

        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = BigInt(attesterId)
            const tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey,
                proofIndex,
                fromProofIndex,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit valid epoch key proof with wrong GST root event', async () => {
            const ZERO_VALUE = 0
            const GSTree = new IncrementalMerkleTree(
                _treeDepths.globalStateTreeDepth,
                ZERO_VALUE,
                2
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
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            const epkProofInput = new EpochKeyProof(publicSignals, proof)
            const isValid = await epkProofInput.verify()
            expect(isValid).to.be.true

            const tx = await unirepContract.submitEpochKeyProof(epkProofInput)
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            epochKey = epkProofInput.epochKey
            proofIndex = Number(
                await unirepContract.getProofIndex(epkProofInput.hash())
            )
        })

        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = genRandomAttestation()
            attestation.attesterId = BigInt(attesterId)
            const tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey,
                proofIndex,
                fromProofIndex,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const attestations = unirepState.getAttestations(epochKey)
            expect(attestations.length).equal(0)
        })

        it('submit valid epoch key proof event in wrong epoch', async () => {
            const userIdx = Math.floor(Math.random() * users.length)
            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const wrongEpoch = epoch + 1
            const epkNonce = Math.floor(
                Math.random() * NUM_EPOCH_KEY_NONCE_PER_EPOCH
            )
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
            const circuitInputs = genEpochKeyCircuitInput(
                userIds[userIdx],
                GSTree,
                userIdx,
                userStateTreeRoots[userIdx],
                wrongEpoch,
                epkNonce
            )
            const { proof, publicSignals } = await genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            const epkProofInput = new EpochKeyProof(publicSignals, proof)
            const isValid = await epkProofInput.verify()
            expect(isValid).to.be.true

            await expect(
                unirepContract.submitEpochKeyProof(epkProofInput)
            ).to.be.revertedWith(
                'Unirep: submit an epoch key proof with incorrect epoch'
            )
        })
    })
})
