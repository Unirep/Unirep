import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, maxUsers, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch, defaultAirdroppedKarma, maxKarmaBudget } from '../../config/testLocal'
import { genRandomSalt, hashLeftRight, SNARK_FIELD_SIZE } from '../../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, genEpochKey, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { Attestation, UnirepState, UserState } from "../../core"
import { IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { formatProofForVerifierContract, genVerifyReputationNullifierProofAndPublicSignals, getSignalByNameViaSym, verifyProveReputationNullifierProof } from '../circuits/utils'


describe('Attesting', function (){
    this.timeout(600000)
    let unirepContract

    let accounts: ethers.Signer[]

    let userId, userCommitment, userId2

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester
    let attester2, attester2Address, attester2Id, unirepContractCalledByAttester2
    let attester3, attester3Address
    let submittedAttestNum: number = 0

    let unirepState
    let userState
    let GSTree

    let circuitInputs
    let results
    let nullifiers: BigInt[] = []
    let publicSignals: BigInt[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("circuit")
        // Set numAttestationsPerEpochKey to 2
        const _settings = {
            maxUsers: maxUsers,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            numAttestationsPerEpochKey: 2,
            epochLength: epochLength,
            attestingFee: attestingFee
        }
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(_treeDepths.globalStateTreeDepth, blankGSLeaf, 2)

        const currentEpoch = await unirepContract.currentEpoch()
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

        console.log('User sign up')
        userId = genIdentity()
        userCommitment = genIdentityCommitment(userId)
        userId2 = genIdentity()
        let tx = await unirepContract.userSignUp(userCommitment, defaultAirdroppedKarma)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        const hashedStateLeaf = await unirepContract.hashStateLeaf(
            [
                userCommitment,
                emptyUserStateRoot,
                BigInt(defaultAirdroppedKarma),
                BigInt(0)
            ]
        )
        GSTree.insert(hashedStateLeaf)

        unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
        userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false
        )
        userState.signUp(currentEpoch, 0)

        console.log('Attesters sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = unirepContract.connect(attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)
        // Sign up another attester
        attester2 = accounts[2]
        attester2Address = await attester2.getAddress()
        unirepContractCalledByAttester2 = unirepContract.connect(attester2)
        tx = await unirepContractCalledByAttester2.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attester2Id = await unirepContract.attesters(attester2Address)
    })

    it('submit attestation should succeed', async () => {
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            true,
        )
        // Assert no attesting fees are collected yet
        circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            Number(attestation.posRep) + Number(attestation.negRep),
            0
        )
        results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const isValid = await verifyProveReputationNullifierProof(results['proof'], results['publicSignals'])
        expect(isValid).to.equal(true)
        const GSTRoot = unirepState.genGSTree(epoch).root
        const nullifierTree = await unirepState.genNullifierTree()
        const nullifierTreeRoot = nullifierTree.getRootHash()
        for (let i = 0; i < maxKarmaBudget; i++) {
            const variableName = 'main.karma_nullifiers['+i+']'
            nullifiers.push(getSignalByNameViaSym('proveReputationNullifier', results['witness'], variableName))
        }
        publicSignals = [
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

        let tx = await unirepContractCalledByAttester.submitAttestation(
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

        // Verify attesting fee is collected
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(attestingFee)

        // Verify attestation hash chain
        let attestationHashChain = hashLeftRight(
            attestation.hash(),
            BigInt(0)
        )
        let attestationHashChain_ = await unirepContract.epochKeyHashchain(toEpochKey)
        expect(attestationHashChain).equal(attestationHashChain_)

        // Verify epoch key is added to epoch key list
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(2)

        // Verify the number of attestations to the sender's epoch key
        let numAttestationsToEpochKey_ = await unirepContract.numAttestationsToEpochKey(fromEpochKey)
        expect(numAttestationsToEpochKey_).equal(1)
        let fromEpochKey_ = await unirepContract.getEpochKey(epoch, 0)
        expect(fromEpochKey).equal(fromEpochKey_)

        // Verify the number of attestations to the receiver's epoch key
        numAttestationsToEpochKey_ = await unirepContract.numAttestationsToEpochKey(toEpochKey)
        expect(numAttestationsToEpochKey_).equal(1)
        let toEpochKey_ = await unirepContract.getEpochKey(epoch, 1)
        expect(toEpochKey).equal(toEpochKey_)

        for (let i = 0; i < maxKarmaBudget; i++) {
            const modedNullifier = BigInt(results['publicSignals'][i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
            unirepState.addKarmaNullifiers(modedNullifier)
        }
        submittedAttestNum++
    })

    it('attestation with incorrect attesterId should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        // Increment nonce to get different epoch key
        let nonce = 1
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(999),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            true,
        )
        circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            Number(attestation.posRep) + Number(attestation.negRep),
            0
        )
        results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        nullifiers = []
        const GSTRoot = unirepState.genGSTree(epoch).root
        const nullifierTree = await unirepState.genNullifierTree()
        const nullifierTreeRoot = nullifierTree.getRootHash()
        for (let i = 0; i < maxKarmaBudget; i++) {
            const variableName = 'main.karma_nullifiers['+i+']'
            nullifiers.push(getSignalByNameViaSym('proveReputationNullifier', results['witness'], variableName))
        }
        publicSignals = [
            GSTRoot,
            nullifierTreeRoot,
            BigInt(true),
            Number(attestation.posRep) + Number(attestation.negRep),
            BigInt(0),
            BigInt(0)
        ]
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee}
        )).to.be.revertedWith('Unirep: mismatched attesterId')
    })

    it('attestation with invalid reputation should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        // Increment nonce to get different epoch key
        let nonce = 1
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)

        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            SNARK_FIELD_SIZE,
            true,
        )
        circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            Number(attestation.posRep) + Number(attestation.negRep),
            0
        )
        results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        nullifiers = []
        const GSTRoot = unirepState.genGSTree(epoch).root
        const nullifierTree = await unirepState.genNullifierTree()
        const nullifierTreeRoot = nullifierTree.getRootHash()
        for (let i = 0; i < maxKarmaBudget; i++) {
            const variableName = 'main.karma_nullifiers['+i+']'
            nullifiers.push(getSignalByNameViaSym('proveReputationNullifier', results['witness'], variableName))
        }
        publicSignals = [
            GSTRoot,
            nullifierTreeRoot,
            BigInt(true),
            Number(attestation.posRep) + Number(attestation.negRep),
            BigInt(0),
            BigInt(0)
        ]
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee}
        )).to.be.revertedWith('Unirep: invalid attestation graffiti')
    })

    it('submit attestation with incorrect fee amount should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        // Increment nonce to get different epoch key
        let nonce = 1
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof'])
        )).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')

        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: (attestingFee.sub(1))})
        ).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')

        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: (attestingFee.add(1))})
        ).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')
    })

    it('attestation from unregistered attester should fail', async () => {
        let nonAttester = accounts[5]
        let nonAttesterAddress = await nonAttester.getAddress()
        let nonAttesterId = await unirepContract.attesters(nonAttesterAddress)
        expect((0).toString()).equal(nonAttesterId.toString())

        let unirepContractCalledByNonAttester = await hardhatEthers.getContractAt(Unirep.abi, unirepContract.address, nonAttester)
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(nonAttesterId),
            BigInt(0),
            BigInt(1),
            genRandomSalt(),
            true,
        )
        circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            Number(attestation.posRep) + Number(attestation.negRep),
            0
        )
        results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        nullifiers = []
        const GSTRoot = unirepState.genGSTree(epoch).root
        const nullifierTree = await unirepState.genNullifierTree()
        const nullifierTreeRoot = nullifierTree.getRootHash()
        for (let i = 0; i < maxKarmaBudget; i++) {
            const variableName = 'main.karma_nullifiers['+i+']'
            nullifiers.push(getSignalByNameViaSym('proveReputationNullifier', results['witness'], variableName))
        }
        publicSignals = [
            GSTRoot,
            nullifierTreeRoot,
            BigInt(true),
            Number(attestation.posRep) + Number(attestation.negRep),
            BigInt(0),
            BigInt(0)
        ]
        await expect(unirepContractCalledByNonAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: attester has not signed up yet')
    })

    it('attestation hash chain should match', async () => {
        // Get the latest hash chain before submitting this attestation.
        // The hash chain should include only attester1's attestation.
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        let attestationHashChainBefore = await unirepContract.epochKeyHashchain(toEpochKey)

        // Attester2 attest
        let attestation: Attestation = new Attestation(
            BigInt(attester2Id),
            BigInt(0),
            BigInt(1),
            genRandomSalt(),
            true,
        )
        let tx = await unirepContractCalledByAttester2.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee})
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify the number of attestations to the sender's epoch key
        let numAttestationsToSenderEpochKey_ = await unirepContract.numAttestationsToEpochKey(fromEpochKey)
        expect(numAttestationsToSenderEpochKey_).equal(2)
        // Verify the number of attestations to the receiver's epoch key
        let numAttestationsToReceiverEpochKey_ = await unirepContract.numAttestationsToEpochKey(toEpochKey)
        expect(numAttestationsToReceiverEpochKey_).equal(2)
        // Verify attestation hash chain
        let attestationHashChainAfter = await unirepContract.epochKeyHashchain(toEpochKey)
        let attestationHashChain = hashLeftRight(
            attestation.hash(),
            attestationHashChainBefore
        )
        expect(attestationHashChain).equal(attestationHashChainAfter)

        // Verify epoch key is NOT added into epoch key list again
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(2)

        for (let i = 0; i < maxKarmaBudget; i++) {
            const modedNullifier = BigInt(results['publicSignals'][i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
            unirepState.addKarmaNullifiers(modedNullifier)
        }
        submittedAttestNum++
    })

    it('number of attestations exceeding limit should fail', async () => {
        // Sign up attester3
        attester3 = accounts[3]
        attester3Address = await attester3.getAddress()
        let unirepContractCalledByAttester3 = unirepContract.connect(attester3)
        let tx = await unirepContractCalledByAttester3.attesterSignUp()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        let attester3Id = await unirepContract.attesters(attester3Address)
        let attestation: Attestation = new Attestation(
            BigInt(attester3Id),
            BigInt(5),
            BigInt(5),
            genRandomSalt(),
            true,
        )
        circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            Number(attestation.posRep) + Number(attestation.negRep),
            0
        )
        results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        nullifiers = []
        const GSTRoot = unirepState.genGSTree(epoch).root
        const nullifierTree = await unirepState.genNullifierTree()
        const nullifierTreeRoot = nullifierTree.getRootHash()
        for (let i = 0; i < maxKarmaBudget; i++) {
            const variableName = 'main.karma_nullifiers['+i+']'
            nullifiers.push(getSignalByNameViaSym('proveReputationNullifier', results['witness'], variableName))
        }
        publicSignals = [
            GSTRoot,
            nullifierTreeRoot,
            BigInt(true),
            Number(attestation.posRep) + Number(attestation.negRep),
            BigInt(0),
            BigInt(0)
        ]
        await expect(unirepContractCalledByAttester3.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: no more attestations to the epoch key is allowed')
    })

    // TODO: test attestation via relayer

    it('burn collected attesting fee should work', async () => {
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(attestingFee.mul(submittedAttestNum))
        await unirepContractCalledByAttester.burnAttestingFee()
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(0)
        expect(await hardhatEthers.provider.getBalance(unirepContract.address)).to.equal(0)
    })
})