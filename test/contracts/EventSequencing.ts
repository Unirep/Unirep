import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import chai from "chai"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch, defaultAirdroppedKarma, maxKarmaBudget } from '../../config/testLocal'
import { genRandomSalt } from '../../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { computeEmptyUserStateRoot, deployUnirep, genEpochKey, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { Attestation, UnirepState, UserState } from "../../core"
import { hash5, IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, verifyProveReputationProof } from '../../circuits/utils'
import { genVerifyReputationNullifierProofAndPublicSignals, getSignalByNameViaSym, verifyProveReputationNullifierProof } from '../circuits/utils'


describe('EventSequencing', function (){
    this.timeout(600000)
    
    enum unirepEvents { 
        UserSignUp,
        AttestationSubmitted,
        ReputationNullifierSubmitted,
        EpochEnded,
        UserStateTransitioned
    }

    let expectedUnirepEventsInOrder: number[] = []

    let unirepContract

    let accounts: ethers.Signer[]

    let currentEpoch
    let GSTree
    let GSTreeLeafIndex: number = 0
    let emptyUserStateRoot
    let unirepState
    let users: any[] = []
    let userIds: any[] = [], userCommitments: any[] = []
    const postId = genRandomSalt()
    const commentId = genRandomSalt()

    let attester, attesterAddress, attesterId, attesterSig, contractCalledByAttester

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        currentEpoch = await unirepContract.currentEpoch()
        unirepState = new UnirepState(
            _treeDepths.globalStateTreeDepth,
            _treeDepths.userStateTreeDepth,
            _treeDepths.epochTreeDepth,
            _treeDepths.nullifierTreeDepth,
            attestingFee,
            epochLength,
            numEpochKeyNoncePerEpoch,
            numAttestationsPerEpochKey,
        )
    })

    it('should sign up first user', async () => {
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        userIds.push(userId)
        userCommitments.push(userCommitment)
        const tx = await unirepContract.userSignUp(userCommitment, defaultAirdroppedKarma)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserSignUp)
        const emptyUserStateRoot = computeEmptyUserStateRoot(unirepState.userStateTreeDepth)
        const hashedStateLeaf = hash5([
            userCommitment,
            emptyUserStateRoot,
            BigInt(defaultAirdroppedKarma),
            BigInt(0),
            BigInt(0)
        ])
        unirepState.signUp(currentEpoch.toNumber(), hashedStateLeaf)
        const userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false
        )
        users.push(userState)
        users[0].signUp(currentEpoch, GSTreeLeafIndex)
        GSTreeLeafIndex ++
    })

    it('should sign up attester', async () => {
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        contractCalledByAttester = await hardhatEthers.getContractAt(Unirep.abi, unirepContract.address, attester)
        const tx = await contractCalledByAttester.attesterSignUp()
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)
    })

    it('should sign up seconde user', async () => {
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        userIds.push(userId)
        userCommitments.push(userCommitment)
        const tx = await unirepContract.userSignUp(userCommitment, defaultAirdroppedKarma)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserSignUp)
        const emptyUserStateRoot = computeEmptyUserStateRoot(unirepState.userStateTreeDepth)
        const hashedStateLeaf = hash5([
            userCommitment,
            emptyUserStateRoot,
            BigInt(defaultAirdroppedKarma),
            BigInt(0),
            BigInt(0)
        ])
        unirepState.signUp(currentEpoch.toNumber(), hashedStateLeaf)
        const userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false
        )
        users.push(userState)
        users[1].signUp(currentEpoch, GSTreeLeafIndex)
        GSTreeLeafIndex ++
    })

    it('second user attests to first user', async () => {
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let fromEpochKey = genEpochKey(userIds[1].identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userIds[0].identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            true,
        )
        // Assert no attesting fees are collected yet
        const circuitInputs = await users[1].genProveReputationNullifierCircuitInputs(
            nonce,
            Number(attestation.posRep) + Number(attestation.negRep),
            0
        )
        const results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const isValid = await verifyProveReputationNullifierProof(results['proof'], results['publicSignals'])
        expect(isValid).to.equal(true)
        const GSTRoot = unirepState.genGSTree(epoch).root
        const nullifierTree = await unirepState.genNullifierTree()
        const nullifierTreeRoot = nullifierTree.getRootHash()
        const nullifiers: BigInt[] = []
        for (let i = 0; i < maxKarmaBudget; i++) {
            const variableName = 'main.karma_nullifiers['+i+']'
            nullifiers.push(getSignalByNameViaSym('proveReputationNullifier', results['witness'], variableName))
        }
        const publicSignals = [
            GSTRoot,
            nullifierTreeRoot,
            BigInt(true),
            Number(attestation.posRep) + Number(attestation.negRep),
            BigInt(0),
            BigInt(0)
        ]

        const isProofValid = await unirepContract.verifyReputationNullifier(
            nullifiers,
            epoch,
            fromEpochKey,
            publicSignals,
            formatProofForVerifierContract(results['proof'])
        )
        expect(isProofValid, "proof is not valid").to.be.true

        let tx = await contractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee}
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Give attest to toEpochKey
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        // Spend user's reputation
        expectedUnirepEventsInOrder.push(unirepEvents.ReputationNullifierSubmitted)
        // Give negative attest to fromEpochKey to represent spending reputation
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
    })

    it('first epoch ended', async () => {
        let numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition(numEpochKey)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })

    it('Second user should perform transition', async () => {
        let transitionFromEpoch = 1
        const numAttestationsPerEpoch = numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey
        const attestationNullifiers: BigInt[] = []
        for (let i = 0; i < numAttestationsPerEpoch; i++) {
            attestationNullifiers.push(BigInt(16 + i))
        }
        const epkNullifiers: BigInt[] = []
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(BigInt(255))
        }
        const proof: BigInt[] = []
        for (let i = 0; i < 8; i++) {
            proof.push(BigInt(0))
        }
        const tx = await unirepContract.updateUserStateRoot(
            genRandomSalt(),
            attestationNullifiers,
            epkNullifiers,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserStateTransitioned)
    })

    
    it('second epoch ended', async () => {
        const numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition(numEpochKey)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })
    
    it('Third epoch ended', async () => {
        const numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition(numEpochKey)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })

    it('First user should perform transition', async () => {
        const transitionFromEpoch = 1
        const numAttestationsPerEpoch = numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey
        const attestationNullifiers: BigInt[] = []
        for (let i = 0; i < numAttestationsPerEpoch; i++) {
            attestationNullifiers.push(BigInt(16 + i))
        }
        const epkNullifiers: BigInt[] = []
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(BigInt(255))
        }
        const proof: BigInt[] = []
        for (let i = 0; i < 8; i++) {
            proof.push(BigInt(0))
        }
        const tx = await unirepContract.updateUserStateRoot(
            genRandomSalt(),
            attestationNullifiers,
            epkNullifiers,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserStateTransitioned)
    })

    it('Second user should perform transition', async () => {
        const transitionFromEpoch = 1
        const numAttestationsPerEpoch = numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey
        const attestationNullifiers: BigInt[] = []
        for (let i = 0; i < numAttestationsPerEpoch; i++) {
            attestationNullifiers.push(BigInt(16 + i))
        }
        const epkNullifiers: BigInt[] = []
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(BigInt(255))
        }
        const proof: BigInt[] = []
        for (let i = 0; i < 8; i++) {
            proof.push(BigInt(0))
        }
        const tx = await unirepContract.updateUserStateRoot(
            genRandomSalt(),
            attestationNullifiers,
            epkNullifiers,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserStateTransitioned)
    })

    it('Unirep events order should match sequencer order', async () => {
        const sequencerFilter = unirepContract.filters.Sequencer()
        const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter)

        for (let i = 0; i < sequencerEvents.length; i++) {
            const event = sequencerEvents[i]
            expect(event.args._event).equal(unirepEvents[expectedUnirepEventsInOrder[i]])
        }
    })
})