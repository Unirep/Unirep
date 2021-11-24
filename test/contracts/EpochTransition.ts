import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, hashLeftRight, genIdentity, genIdentityCommitment } from '@unirep/crypto'
import { formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { deployUnirep, getUnirepContract } from '@unirep/contracts'

import { computeEmptyUserStateRoot, genEpochKey, getTreeDepthsForTesting } from '../../core/utils'
import { epochLength, maxAttesters, maxReputationBudget, maxUsers, numEpochKeyNoncePerEpoch } from '../../config/testLocal'
import { Attestation, IEpochTreeLeaf, UnirepState, UserState } from '../../core'
import { ISettings } from '../../core/UnirepState'

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
    let epochKeyProofIndex
    const proofIndexes: BigInt[] = []
    const attestingFee = ethers.utils.parseEther("0.1") // to avoid VM Exception: 'Address: insufficient balance'

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("circuit")
        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: maxAttesters,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            epochLength: epochLength,
            attestingFee:attestingFee
        }
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)
        const emptyUserStateRoot = computeEmptyUserStateRoot(_treeDepths.userStateTreeDepth)
        const blankGSLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)

        const setting: ISettings = {
            globalStateTreeDepth: _treeDepths.globalStateTreeDepth,
            userStateTreeDepth: _treeDepths.userStateTreeDepth,
            epochTreeDepth: _treeDepths.epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            defaultGSTLeaf: blankGSLeaf
        }
        unirepState = new UnirepState(
            setting
        )

        console.log('User sign up')
        userId = genIdentity()
        userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        
        const currentEpoch = await unirepContract.currentEpoch()
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
        unirepContractCalledByAttester = getUnirepContract(unirepContract.address, attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        // Submit attestations
        let epoch = await unirepContract.currentEpoch()
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let results = await userState.genVerifyEpochKeyProof(nonce)
        let epochKeyProof = results['publicSignals'].concat([formatProofForVerifierContract(results['proof'])])
        let isValid = await verifyProof('verifyEpochKey', results['proof'], results['publicSignals'])
        expect(isValid, 'Verify epoch key proof off-chain failed').to.be.true

        // Submit epoch key proof
        tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        let proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)

        // Submit attestations
        const attestationNum = 2
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
                epochKeyProofIndex,
                {value: attestingFee}
            )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
            unirepState.addAttestation(epochKey, attestation)
        }
        
        nonce = 2
        epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        results = await userState.genVerifyEpochKeyProof(nonce)
        epochKeyProof = results['publicSignals'].concat([formatProofForVerifierContract(results['proof'])])

        // Submit epoch key proof
        tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)

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
                epochKeyProofIndex,
                {value: attestingFee}
            )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
            unirepState.addAttestation(epochKey, attestation)
        }

        nonce = 0
        epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        results = await userState.genVerifyEpochKeyProof(nonce)
        epochKeyProof = results['publicSignals'].concat([formatProofForVerifierContract(results['proof'])])

        // Submit epoch key proof
        tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)

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
                epochKeyProofIndex,
                {value: attestingFee}
            )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
            unirepState.addAttestation(epochKey, attestation)
        }
    })

    it('premature epoch transition should fail', async () => {
        await expect(unirepContract.beginEpochTransition()
            ).to.be.revertedWith('Unirep: epoch not yet ended')
    })

    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch()

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
        // Assert no epoch transition compensation is dispensed to volunteer
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.be.equal(0)
        // Begin epoch transition 
        let tx = await unirepContractCalledByAttester.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log("Gas cost of sealing one epoch key:", receipt.gasUsed.toString())
        // Verify compensation to the volunteer increased
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.gt(0)

        // Complete epoch transition
        expect(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1))

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await hardhatEthers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))

        // Unirep and user state transition from the first epoch
        const epochTreeLeaves: IEpochTreeLeaf[] = []

        // Generate valid epoch tree leaves
        const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted(epoch)
        const attestationSubmittedEvents =  await unirepContract.queryFilter(attestationSubmittedFilter)
        const isProofValidMap = {}
        const attestationMap = {}

        // compute hash chain of valid epoch key
        for (let i = 0; i < attestationSubmittedEvents.length; i++) {
            const proofIndex = attestationSubmittedEvents[i].args?._proofIndex
            if(isProofValidMap[proofIndex.toString()] == 0){
                continue
            } else if (isProofValidMap[proofIndex.toString()] == undefined) {
                const epochKeyProofFilter = unirepContract.filters.EpochKeyProof(proofIndex)
                const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter)
                const repProofFilter = unirepContract.filters.ReputationNullifierProof(proofIndex)
                const repProofEvent = await unirepContract.queryFilter(repProofFilter)
                const signUpProofFilter = unirepContract.filters.UserSignedUpProof(proofIndex)
                const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)
                let isProofValid
                let _epochKey

                if (epochKeyProofEvent.length == 1){
                    console.log('epoch key event')
                    const args = epochKeyProofEvent[0]?.args?.epochKeyProofData
                    isProofValid = await unirepContract.verifyEpochKeyValidity(
                        args?.globalStateTree,
                        args?.epoch,
                        args?.epochKey,
                        args?.proof,
                    )
                    _epochKey = args?.epochKey
                } else if (repProofEvent.length == 1){
                    console.log('rep nullifier event')
                    const args = repProofEvent[0]?.args?.reputationProofData
                    isProofValid = await unirepContract.verifyReputation(
                        args?.repNullifiers,
                        args?.epoch,
                        args?.epochKey,
                        args?.globalStateTree,
                        args?.attesterId,
                        args?.proveReputationAmount,
                        args?.minRep,
                        args?.proveGraffiti,
                        args?.graffitiPreImage,
                        args?.proof,
                    )
                    _epochKey = args?.epochKey
                } else if (signUpProofEvent.length == 1){
                    console.log('sign up event')
                    const args = signUpProofEvent[0]?.args?.signUpProofData
                    isProofValid = await unirepContract.verifyUserSignUp(
                        args?.epoch,
                        args?.epochKey,
                        args?.globalStateTree,
                        args?.attesterId,
                        args?.proof,
                    )
                    _epochKey = args?.epochKey
                }

                if (!isProofValid) {
                    isProofValidMap[proofIndex.toString()] == 0
                    continue
                }
                isProofValidMap[proofIndex.toString()] = 1

                const epochKey = attestationSubmittedEvents[i].args?._epochKey
                if(epochKey != _epochKey) continue
                const _attestation = attestationSubmittedEvents[i].args?.attestation
                if(attestationMap[epochKey] == undefined) {
                    attestationMap[epochKey] = BigInt(0)
                } 
                const attestation = new Attestation(
                    BigInt(_attestation?.attesterId.toString()),
                    BigInt(_attestation?.posRep.toString()),
                    BigInt(_attestation?.negRep.toString()),
                    BigInt(_attestation?.graffiti.toString()),
                    BigInt(_attestation?.signUp.toString()),
                )
                attestationMap[epochKey] = hashLeftRight(
                    attestation.hash(), 
                    attestationMap[epochKey]
                )
            }
        }

        // seal hash chain
        for(let k in attestationMap) {
            attestationMap[k] = hashLeftRight(BigInt(1), attestationMap[k])
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: BigInt(k),
                hashchainResult: attestationMap[k]
            }
            epochTreeLeaves.push(epochTreeLeaf)
        }

        await unirepState.epochTransition(epoch, epochTreeLeaves)
    })
        
    it('start user state transition should succeed', async() => {
        results = await userState.genUserStateTransitionProofs()
        const isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
        expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

        const blindedUserState = results.startTransitionProof.blindedUserState
        const blindedHashChain = results.startTransitionProof.blindedHashChain
        const GSTreeRoot = results.startTransitionProof.globalStateTreeRoot
        const proof = formatProofForVerifierContract(results.startTransitionProof.proof)

        const tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            proof
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())

        let proofNullifier = await unirepContract.hashStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            proof
        )
        let proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(BigInt(proofIndex))
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

            const proofNullifier = await unirepContract.hashProcessAttestationsProof(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(results.processAttestationProofs[i].proof),
            )
            const proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(BigInt(proofIndex))
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
        
        let transitionProof = [
            newGSTLeaf,
            outputEpkNullifiers,
            fromEpoch,
            blindedUserStates,
            GSTreeRoot,
            blindedHashChains,
            epochTreeRoot,
            formatProofForVerifierContract(results.finalTransitionProof.proof),
        ]
        const tx = await unirepContract.updateUserStateRoot(
            transitionProof,
            proofIndexes,
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

    it('verify user state transition proofs should succeed', async() => {
        const currentEpoch = await unirepContract.currentEpoch()
        const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
        const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
        expect(newLeafEvents.length).to.equal(1)

        const proofIndex = newLeafEvents[0]?.args?._proofIndex
        const transitionFilter = unirepContract.filters.UserStateTransitionProof(proofIndex)
        const transitionEvents = await unirepContract.queryFilter(transitionFilter)
        expect(transitionEvents.length, `Transition event is not found`).to.equal(1)

        // proof index is supposed to be unique, therefore it should be only one event found
        const transitionArgs = transitionEvents[0]?.args?.userTransitionedData
        // backward verification
        const isValid = await unirepContract.verifyUserStateTransition(
            transitionArgs.newGlobalStateTreeLeaf,
            transitionArgs.epkNullifiers,
            transitionArgs.transitionFromEpoch,
            transitionArgs.blindedUserStates,
            transitionArgs.fromGlobalStateTree,
            transitionArgs.blindedHashChains,
            transitionArgs.fromEpochTree,
            transitionArgs.proof,
        )
        expect(isValid, 'Verify user state transition on-chain failed').to.be.true

        const _proofIndexes = transitionEvents[0]?.args?._proofIndexRecords
        // Proof index 0 should be the start transition proof
        const startTransitionFilter = unirepContract.filters.StartedTransitionProof(_proofIndexes[0], transitionArgs.blindedUserStates[0], transitionArgs.fromGlobalStateTree)
        const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter)
        expect(startTransitionEvents.length, 'Start transition proof not found').not.equal(0)

        const startTransitionArgs = startTransitionEvents[0]?.args
        const isStartTransitionProofValid = await unirepContract.verifyStartTransitionProof(
            startTransitionArgs?._blindedUserState,
            startTransitionArgs?._blindedHashChain,
            startTransitionArgs?._globalStateTree,
            startTransitionArgs?._proof,
        )
        expect(isStartTransitionProofValid, 'Verify start user state transition proof on-chain failed').to.be.true
        
        let currentBlindedUserState = transitionArgs.blindedUserStates[0]
        const finalBlindedUserState = transitionArgs.blindedUserStates[1]
        // The rest are process attestations proofs
        for (let i = 1; i < _proofIndexes.length; i++) {
            const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof(_proofIndexes[i], currentBlindedUserState)
            const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter)
            expect(processAttestationsEvents.length, 'Process attestations proof not found').not.equal(0)

            const args = processAttestationsEvents[0]?.args
            const isValid = await unirepContract.verifyProcessAttestationProof(
                args?._outputBlindedUserState,
                args?._outputBlindedHashChain,
                args?._inputBlindedUserState,
                args?._proof
            )
            expect(isValid, 'Verify process attestations proof on-chain failed').to.be.true
            currentBlindedUserState = args?._outputBlindedUserState
        }
        expect(currentBlindedUserState).equal(finalBlindedUserState)
    })

    it('epoch transition with no attestations and epoch keys should also succeed', async () => {
        let epoch = await unirepContract.currentEpoch()

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
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