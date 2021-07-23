import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import chai from "chai"
import { maxUsers, attestingFee, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch, defaultAirdroppedKarma, maxKarmaBudget } from '../../config/testLocal'
import { genRandomSalt, hashLeftRight } from '../../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, genEpochKey, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { UnirepState, UserState } from '../../core'
import { IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { formatProofForVerifierContract, genVerifyReputationNullifierProofAndPublicSignals, genVerifyUserStateTransitionProofAndPublicSignals, getSignalByNameViaSym, verifyUserStateTransitionProof } from '../circuits/utils'


describe('Epoch Transition', function (){
    this.timeout(600000)

    let unirepContract: ethers.Contract
    let accounts: ethers.Signer[]
    let userId, userCommitment, userId2
    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    let numEpochKey
    const epochLength = 1000

    let unirepState
    let userState
    let GSTree

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("circuit")
        const _settings = {
            maxUsers: maxUsers,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            numAttestationsPerEpochKey: numAttestationsPerEpochKey,
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

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = await hardhatEthers.getContractAt(Unirep.abi, unirepContract.address, attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        // Submit 2 attestations
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        let circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            attestation.posRep + attestation.negRep,
            0
        )
        let results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        let nullifiers = results['publicSignals'].slice(0, maxKarmaBudget)
        let publicSignals = results['publicSignals'].slice(maxKarmaBudget+2)

        tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        for (let i = 0; i < maxKarmaBudget; i++) {
            const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
            unirepState.addKarmaNullifiers(modedNullifier)
        }
        
        nonce = 1
        fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        toEpochKey = genEpochKey(userId2.identityNullifier, epoch, nonce)
        attestation = {
            attesterId: attesterId.toString(),
            posRep: 0,
            negRep: 3,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            attestation.posRep + attestation.negRep,
            0
        )
        results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        nullifiers = results['publicSignals'].slice(0, maxKarmaBudget)
        publicSignals = results['publicSignals'].slice(maxKarmaBudget+2)

        tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            fromEpochKey,
            toEpochKey,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(4)

        for (let i = 0; i < maxKarmaBudget; i++) {
            const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
            unirepState.addKarmaNullifiers(modedNullifier)
        }
    })

    it('premature epoch transition should fail', async () => {
        const numEpochKeysToSeal = numEpochKey
        await expect(unirepContract.beginEpochTransition(numEpochKeysToSeal)
            ).to.be.revertedWith('Unirep: epoch not yet ended')
    })

    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch()
        let epochKeyHashchainMap = {}
        let epochKey_, hashChainBefore
        for (let i = 0; i < numEpochKey; i++) {
            epochKey_ = await unirepContract.getEpochKey(epoch, i)
            hashChainBefore = await unirepContract.epochKeyHashchain(epochKey_)
            epochKeyHashchainMap[epochKey_] = hashChainBefore
        }

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
        // Assert no epoch transition compensation is dispensed to volunteer
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.be.equal(0)
        // Begin epoch transition but only seal hash chain of one epoch key
        let numEpochKeysToSeal = numEpochKey.sub(1)
        let tx = await unirepContractCalledByAttester.beginEpochTransition(numEpochKeysToSeal)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log("Gas cost of sealing one epoch key:", receipt.gasUsed.toString())
        expect(await unirepContract.getNumSealedEpochKey(epoch)).to.be.equal(3)
        // Verify compensation to the volunteer increased
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.gt(0)

        // Complete epoch transition by sealing hash chain of the rest of the epoch keys
        const prevAttesterCompensation = await unirepContract.epochTransitionCompensation(attesterAddress)
        numEpochKeysToSeal = numEpochKey
        tx = await unirepContractCalledByAttester.beginEpochTransition(numEpochKeysToSeal)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log("Gas cost of sealing hash chain of the rest of the epoch key and complete epoch transition:", receipt.gasUsed.toString())
        expect(await unirepContract.getNumSealedEpochKey(epoch)).to.be.equal(numEpochKey)
        expect(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1))
        // Verify compensation to the volunteer increased
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.gt(prevAttesterCompensation)
        let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch)
        epochKeys_ = epochKeys_.map((epk) => epk.toString())
        expect(epochKeys_.length).to.be.equal(numEpochKey)

        // Verify each epoch key hash chain is sealed
        let hashChainAfter
        let sealedHashChain
        let epkIndex
        for (epochKey_ in epochKeyHashchainMap) {
            sealedHashChain = hashLeftRight(
                BigInt(1),
                epochKeyHashchainMap[epochKey_]
            )
            hashChainAfter = await unirepContract.epochKeyHashchain(epochKey_)
            expect(hashChainAfter).equal(sealedHashChain)

            // Check that epoch keys and hashchains also match the ones in epoch tree
            epkIndex = epochKeys_.indexOf(epochKey_)
            expect(epkIndex >= 0).to.be.true
            expect(epochKeyHashchains_[epkIndex]).to.be.equal(sealedHashChain)
        }

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await hardhatEthers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))

        // Unirep and user state transition from the first epoch
        unirepState.epochTransition(1, [])
        const circuitInputs = await userState.genUserStateTransitionCircuitInputs()
        const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
        expect(isValid, 'Verify user transition circuit off-chain failed').to.be.true
        const newGSTLeaf = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.new_GST_leaf')
        const newState = await userState.genNewUserStateAfterTransition()
        const epkNullifiers = userState.getEpochKeyNullifiers(1)
        console.log()
        expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf)
        userState.transition(newState.newUSTLeaves)
        unirepState.userStateTransition(epoch_, BigInt(newGSTLeaf), epkNullifiers)
    })

    it('attesting to a sealed epoch key should fail', async () => {
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }

        const nonce = 0
        const epoch = await unirepContract.currentEpoch()
        const fromEpochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
            nonce,
            attestation.posRep + attestation.negRep,
            0
        )
        const results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const nullifiers = results['publicSignals'].slice(0, maxKarmaBudget)
        const publicSignals = results['publicSignals'].slice(maxKarmaBudget+2)

        let prevEpoch = (await unirepContract.currentEpoch()).sub(1)
        let numEpochKey = await unirepContract.getNumEpochKey(prevEpoch)
        for (let i = 0; i < numEpochKey; i++) {
            let epochKey_ = await unirepContract.getEpochKey(prevEpoch, i)

            await expect(unirepContractCalledByAttester.submitAttestation(
                attestation,
                fromEpochKey,
                epochKey_,
                nullifiers,
                publicSignals,
                formatProofForVerifierContract(results['proof']),
                {value: attestingFee}
            )).to.be.revertedWith('Unirep: hash chain of this epoch key has been sealed')
        }
    })

    it('epoch transition with no attestations and epoch keys should also succeed', async () => {
        let epoch = await unirepContract.currentEpoch()
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(0)

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
        // Begin epoch transition
        const numEpochKeysToSeal = await unirepContract.getNumEpochKey(epoch)
        let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await hardhatEthers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))
    })

    it('collecting epoch transition compensation should succeed', async () => {
        const compensation = await unirepContract.epochTransitionCompensation(attesterAddress)
        expect(compensation).to.gt(0)
        // Set gas price to 0 so attester will not be charged transaction fee
        await expect(() => unirepContractCalledByAttester.collectEpochTransitionCompensation({gasPrice: 0}))
            .to.changeEtherBalance(attester, compensation)
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.equal(0)
    })
})