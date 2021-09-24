import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, hashLeftRight, IncrementalQuinTree, genIdentity, genIdentityCommitment } from '@unirep/crypto'
import { formatProofForVerifierContract, genProofAndPublicSignals, verifyProof } from '@unirep/circuits'
import { deployUnirep, getUnirepContract } from '@unirep/contracts'

import { computeEmptyUserStateRoot, genEpochKey, getTreeDepthsForTesting } from '../../core/utils'
import { attestingFee, epochLength, maxReputationBudget, numEpochKeyNoncePerEpoch } from '../../config/testLocal'
import { Attestation, IEpochTreeLeaf, UnirepState, UserState } from '../../core'

describe('Epoch Transition', function () {
    this.timeout(1000000)

    let unirepContract: ethers.Contract
    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    let numEpochKey

    let unirepState
    let userState
    let GSTree
    let circuitInputs
    let results
    const signedUpInLeaf = 1

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("circuit")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepState = new UnirepState(
            _treeDepths.globalStateTreeDepth,
            _treeDepths.userStateTreeDepth,
            _treeDepths.epochTreeDepth,
            attestingFee,
            epochLength,
            numEpochKeyNoncePerEpoch,
            maxReputationBudget,
        )

        console.log('User sign up')
        userId = genIdentity()
        userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        
        const currentEpoch = await unirepContract.currentEpoch()
        const emptyUserStateRoot = computeEmptyUserStateRoot(_treeDepths.userStateTreeDepth)
        const hashedStateLeaf = await unirepContract.hashStateLeaf([userCommitment, emptyUserStateRoot])

        unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
        userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false,
        )
        const latestTransitionedToEpoch = currentEpoch.toNumber()
        const GSTreeLeafIndex = 0
        userState.signUp(latestTransitionedToEpoch, GSTreeLeafIndex, 0, 0)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = await getUnirepContract(unirepContract.address, attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        // Submit 2 attestations
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const attestationNum = 11
        for (let i = 0; i < attestationNum; i++) {
            let attestation = new Attestation(
                BigInt(attesterId.toString()),
                BigInt(i),
                BigInt(0),
                genRandomSalt(),
                BigInt(signedUpInLeaf),
            ) 
            tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey,
                {value: attestingFee}
            )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
            unirepState.addAttestation(epochKey, attestation)
        }
        
        nonce = 1
        epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const attestation = new Attestation(
            BigInt(attesterId.toString()),
            BigInt(0),
            BigInt(99),
            BigInt(0),
            BigInt(signedUpInLeaf),
        )
        tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        unirepState.addAttestation(epochKey, attestation)

        numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(2)
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
        expect(await unirepContract.getNumSealedEpochKey(epoch)).to.be.equal(1)
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
        // Get epoch tree leaves of the ending epoch
        epochKeys_ = epochKeys_.map((epk) => BigInt(epk.toString()))
        epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc.toString()))
        const epochTreeLeaves: IEpochTreeLeaf[] = []
        for (let i = 0; i < epochKeys_.length; i++) {
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: epochKeys_[i],
                hashchainResult: epochKeyHashchains_[i]
            }
            epochTreeLeaves.push(epochTreeLeaf)
        }

        unirepState.epochTransition(epoch, epochTreeLeaves)
    })
        
    it('start user state transition should succeed', async() => {
        results = await userState.genUserStateTransitionProofs()
        const isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
        expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

        const tx = await unirepContract.startUserStateTransition(
            results.startTransitionProof.blindedUserState,
            results.startTransitionProof.blindedHashChain,
            results.startTransitionProof.globalStateTreeRoot,
            formatProofForVerifierContract(results.startTransitionProof.proof),
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())
    })

    it('submit process attestations proofs should succeed', async() => {
        for (let i = 0; i < results.processAttestationProofs.length; i++) {
            const isValid = await verifyProof('processAttestations', results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
            expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

            const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
            const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
            const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

            const tx = await unirepContract.processAttestations(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(results.processAttestationProofs[i].proof),
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
            console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())
        }
    })

    it('submit user state transition proofs should succeed', async() => {
        const isValid = await verifyProof('userStateTransition', results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
        expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true

        const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf
        const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
        const blindedUserStates = results.finalTransitionProof.blindedUserStates
        const blindedHashChains = results.finalTransitionProof.blindedHashChains
        const fromEpoch = results.finalTransitionProof.transitionedFromEpoch
        const GSTreeRoot = results.finalTransitionProof.fromGSTRoot
        const epochTreeRoot = results.finalTransitionProof.fromEpochTree

        // Verify userStateTransition proof on-chain
        const isProofValid = await unirepContract.verifyUserStateTransition(
            newGSTLeaf,
            outputEpkNullifiers,
            fromEpoch,
            blindedUserStates,
            GSTreeRoot,
            blindedHashChains,
            epochTreeRoot,
            formatProofForVerifierContract(results.finalTransitionProof.proof),
        )
        expect(isProofValid, 'Verify user state transition circuit on-chain failed').to.be.true

        const tx = await unirepContract.updateUserStateRoot(
            newGSTLeaf,
            outputEpkNullifiers,
            blindedUserStates,
            blindedHashChains,
            fromEpoch,
            GSTreeRoot,
            epochTreeRoot,
            formatProofForVerifierContract(results.finalTransitionProof.proof),
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())

        const newState = await userState.genNewUserStateAfterTransition()
        const epkNullifiers = userState.getEpochKeyNullifiers(1)
        const epoch_ = await unirepContract.currentEpoch()
        expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf.toString())
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
            signUp: signedUpInLeaf,
        }

        let prevEpoch = (await unirepContract.currentEpoch()).sub(1)
        let numEpochKey = await unirepContract.getNumEpochKey(prevEpoch)
        for (let i = 0; i < numEpochKey; i++) {
            let epochKey_ = await unirepContract.getEpochKey(prevEpoch, i)

            await expect(unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey_,
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
        await expect(() => unirepContractCalledByAttester.collectEpochTransitionCompensation())
            .to.changeEtherBalance(attester, compensation)
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.equal(0)
    })
})