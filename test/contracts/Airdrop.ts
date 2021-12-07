import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, hash5, hashLeftRight, genIdentity, genIdentityCommitment } from '@unirep/crypto'
import { CircuitName, formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts'

import { attestingFee, circuitUserStateTreeDepth, epochLength, maxAttesters, maxReputationBudget, maxUsers, numEpochKeyNoncePerEpoch } from '../../config/testLocal'
import { getTreeDepthsForTesting } from '../../core/utils'
import { Attestation, IEpochTreeLeaf, UnirepState, UserState } from '../../core'
import { computeEmptyUserStateRoot, genNewSMT } from '../utils'
import { ISettings } from '../../core/UnirepState'

describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract
    let unirepState
    let userState

    let accounts: ethers.Signer[]

    let numLeaf = 0

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester
    let attester2, attester2Address, attester2Id, unirepContractCalledByAttester2

    const airdropPosRep = 20
    const epkNonce = 0
    const proofIndexes: BigInt[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: maxAttesters,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            epochLength: epochLength,
            attestingFee: attestingFee
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
    })

    it('compute SMT root should succeed', async () => {
        const leafIdx = BigInt(Math.floor(Math.random() * (2** circuitUserStateTreeDepth)))
        const leafValue = genRandomSalt()
        const oneLeafUSTRoot = await unirepContract.calcAirdropUSTRoot(leafIdx, leafValue)

        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        await tree.update(leafIdx, leafValue)
        const SMTRoot = await tree.getRootHash()

        expect(oneLeafUSTRoot, 'airdrop root does not match').equal(SMTRoot)
    })

    it('attester signs up and attester sets airdrop amount should succeed', async() => {
        console.log('Attesters sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = unirepContract.connect(attester)
        let tx = await unirepContractCalledByAttester.attesterSignUp()
        let receipt = await tx.wait()
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

        console.log('attesters set airdrop amount')
        tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        const airdroppedAmount = await unirepContract.airdropAmount(attesterAddress)
        expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
    })

    it('user signs up through attester should get airdrop pos rep', async() => {
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numLeaf].args._hashedLeaf
        numLeaf ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const leafValue = hash5([BigInt(airdropPosRep), BigInt(0), BigInt(0), BigInt(1)])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        await tree.update(BigInt(attesterId), leafValue)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)

        // user can prove airdrop pos rep
        const currentEpoch = await unirepContract.currentEpoch()

        unirepState.signUp(currentEpoch.toNumber(), BigInt(newGSTLeaf))
        userState = new UserState(
            unirepState,
            userId,
            false,
        )
        const latestTransitionedToEpoch = currentEpoch.toNumber()
        const GSTreeLeafIndex = 0
        userState.signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attesterId, airdropPosRep)
        const proveGraffiti = 0
        const minPosRep = 19, graffitiPreImage = 0
        const nonceList = [BigInt(0), BigInt(1)]
        const initLength = nonceList.length
        for (let i = 0; i < maxReputationBudget -  initLength; i++) {
            nonceList.push(BigInt(-1))
        }
        const results = await userState.genProveReputationProof(BigInt(attesterId), epkNonce, minPosRep, proveGraffiti, graffitiPreImage, nonceList)
        const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user can get airdrop positive reputation through calling airdrop function in Unirep', async() => {
        const results = await userState.genUserSignUpProof(BigInt(attesterId))
        const isValid = await verifyProof(CircuitName.proveUserSignUp, results.proof, results.publicSignals)
        expect(isValid, 'Verify user sign up proof off-chain failed').to.be.true
        const userSignUpProof = results.publicSignals.concat([formatProofForVerifierContract(results.proof)])

        let tx = await unirepContractCalledByAttester.airdropEpochKey(userSignUpProof, {value: attestingFee})
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const attestationToEpochKey = new Attestation(
            BigInt(attesterId),
            BigInt(airdropPosRep),
            BigInt(0),
            BigInt(0),
            BigInt(1),
        )
        unirepState.addAttestation(results.epochKey, attestationToEpochKey)
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
        const attestationMap = {}

        // compute hash chain of valid epoch key
        for (let i = 0; i < attestationSubmittedEvents.length; i++) {
            const proofIndex = attestationSubmittedEvents[i].args?._proofIndex
            const epochKeyProofFilter = unirepContract.filters.EpochKeyProof(proofIndex)
            const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter)
            const repProofFilter = unirepContract.filters.ReputationNullifierProof(proofIndex)
            const repProofEvent = await unirepContract.queryFilter(repProofFilter)
            const signUpProofFilter = unirepContract.filters.UserSignedUpProof(proofIndex)
            const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)

            let isProofValid
            // Should find ReputationNullifierProof as well
            // Should find UserSignedUpProof as well
            if (epochKeyProofEvent.length == 1){
                console.log('epoch key event')
                const args = epochKeyProofEvent[0]?.args?.epochKeyProofData
                isProofValid = await unirepContract.verifyEpochKeyValidity(
                    args?.globalStateTree,
                    args?.epoch,
                    args?.epochKey,
                    args?.proof,
                )
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
            } else if (signUpProofEvent.length == 1){
                console.log('sign up event')
                const args = signUpProofEvent[0]?.args?.signUpProofData
                isProofValid = await unirepContract.verifyUserSignUp(
                    args?.epoch,
                    args?.epochKey,
                    args?.globalStateTree,
                    args?.attesterId,
                    args?.userHasSignedUp,
                    args?.proof,
                )
            }

            if(isProofValid) {
                const epochKey = attestationSubmittedEvents[i].args?._epochKey
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

    it('user should perform user state transition', async() => {
        let results = await userState.genUserStateTransitionProofs()
        let isValid = await verifyProof(CircuitName.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
        expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

        // Verify start transition proof on-chain
        let isProofValid = await unirepContract.verifyStartTransitionProof(
            results.startTransitionProof.blindedUserState,
            results.startTransitionProof.blindedHashChain,
            results.startTransitionProof.globalStateTreeRoot,
            formatProofForVerifierContract(results.startTransitionProof.proof),
        )
        expect(isProofValid, 'Verify start transition circuit on-chain failed').to.be.true

        const blindedUserState = results.startTransitionProof.blindedUserState
        const blindedHashChain = results.startTransitionProof.blindedHashChain
        const GSTreeRoot = results.startTransitionProof.globalStateTreeRoot
        const proof = formatProofForVerifierContract(results.startTransitionProof.proof)

        let tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            proof
        )
        let receipt = await tx.wait()
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

        for (let i = 0; i < results.processAttestationProofs.length; i++) {
            const isValid = await verifyProof(CircuitName.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
            expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

            const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
            const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
            const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

            // Verify processAttestations proof on-chain
            const isProofValid = await unirepContract.verifyProcessAttestationProof(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(results.processAttestationProofs[i].proof),
            )
            expect(isProofValid, 'Verify process attestations circuit on-chain failed').to.be.true

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

        isValid = await verifyProof(CircuitName.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
        expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true

        const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf
        const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
        const blindedUserStates = results.finalTransitionProof.blindedUserStates
        const blindedHashChains = results.finalTransitionProof.blindedHashChains
        const fromEpoch = results.finalTransitionProof.transitionedFromEpoch
        // const GSTreeRoot = results.finalTransitionProof.fromGSTRoot
        const epochTreeRoot = results.finalTransitionProof.fromEpochTree

        // Verify userStateTransition proof on-chain
        isProofValid = await unirepContract.verifyUserStateTransition(
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
        tx = await unirepContract.updateUserStateRoot(
            transitionProof,
            proofIndexes,
        )
        receipt = await tx.wait()
        expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
        numLeaf ++
        
        userState.saveAttestations()
        const newState = await userState.genNewUserStateAfterTransition()
        const epkNullifiers = userState.getEpochKeyNullifiers(1)
        const epoch_ = await unirepContract.currentEpoch()
        expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf.toString())
        userState.transition(newState.newUSTLeaves)
        unirepState.userStateTransition(epoch_, BigInt(newGSTLeaf), epkNullifiers)
    })

    it('User can prove that he has at least twice airdrop positive reputation', async() => {
        // generate reputation proof should success
        const proveGraffiti = 0
        const minPosRep = 30, graffitiPreImage = 0
        const results = await userState.genProveReputationProof(BigInt(attesterId), epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
        const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester2.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numLeaf].args._hashedLeaf
        numLeaf ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)

        // prove reputation should fail
        const currentEpoch = await unirepContract.currentEpoch()
        unirepState.signUp(currentEpoch.toNumber(), BigInt(newGSTLeaf))
        userState = new UserState(
            unirepState,
            userId,
            false,
        )
        const latestTransitionedToEpoch = currentEpoch.toNumber()
        const GSTreeLeafIndex = 0
        const airdropAmount = 0
        userState.signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attester2Id, airdropAmount)
        const proveGraffiti = 0
        const minPosRep = 19, graffitiPreImage = 0
        const results = await userState.genProveReputationProof(BigInt(attesterId), epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
        const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.false
    })

    it('user signs up through a non-signed up attester should succeed and gets no airdrop', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester2.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numLeaf].args._hashedLeaf
        numLeaf ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)
    })
})