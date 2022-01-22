"use strict";
// import { ethers as hardhatEthers } from 'hardhat'
// import { ethers } from 'ethers'
// import { expect } from 'chai'
// import { genRandomSalt, genIdentity, genIdentityCommitment, } from '@unirep/crypto'
// import { Circuit, formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
// import { deployUnirep } from '@unirep/contracts'
// import { Attestation, attestingFee, epochLength, genUserStateFromContract, genUserStateFromParams, getTreeDepthsForTesting, maxAttesters, maxReputationBudget, maxUsers, numEpochKeyNoncePerEpoch,  UserState } from '../../core'
// describe('Generate user state', function () {
//     this.timeout(500000)
//     let users: UserState[] = new Array(2)
//     const firstUser = 0
//     const secondUser = 1
//     let userIds: any[] = []
//     let userCommitments: BigInt[] = []
//     let savedUserState: any
//     let secondUserState: any
//     let unirepContract: ethers.Contract
//     let unirepContractCalledByAttester: ethers.Contract
//     let _treeDepths
//     let accounts: ethers.Signer[]
//     const attester = new Object()
//     let attesterId
//     before(async () => {
//         accounts = await hardhatEthers.getSigners()
//         _treeDepths = getTreeDepthsForTesting("circuit")
//         const _settings = {
//             maxUsers: maxUsers,
//             maxAttesters: maxAttesters,
//             numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
//             maxReputationBudget: maxReputationBudget,
//             epochLength: epochLength,
//             attestingFee: attestingFee
//         }
//         unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)
//     })
//     describe('Attester sign up and set airdrop', () => {
//         it('attester sign up', async () => {
//             attester['acct'] = accounts[2]
//             attester['addr'] = await attester['acct'].getAddress()
//             unirepContractCalledByAttester = unirepContract.connect(attester['acct'])
//             let tx = await unirepContractCalledByAttester.attesterSignUp()
//             let receipt = await tx.wait()
//             expect(receipt.status, 'Attester signs up failed').to.equal(1)
//         })
//         it('attester set airdrop amount', async () => {
//             const airdropPosRep = 10
//             const tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep)
//             const receipt = await tx.wait()
//             expect(receipt.status).equal(1)
//             const airdroppedAmount = await unirepContract.airdropAmount(attester['addr'])
//             expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
//         })
//     })
//     describe('User Sign Up event', () => {
//         it('users sign up events', async () => {
//             const id = genIdentity()
//             const commitment = genIdentityCommitment(id)
//             userIds.push(id)
//             userCommitments.push(commitment)
//             const initUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             const tx = await unirepContractCalledByAttester.userSignUp(commitment)
//             const receipt = await tx.wait()
//             expect(receipt.status, 'User sign up failed').to.equal(1)
//             const currentEpoch = initUserState.getUnirepStateCurrentEpoch()
//             const latestTransitionedToEpoch = currentEpoch
//             const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
//             const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
//             expect(newLeafEvents.length).equal(1)
//             const proofIndex = newLeafEvents[0].args?._proofIndex
//             const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
//             const signUpEvents = await unirepContract.queryFilter(signUpFilter)
//             expect(signUpEvents.length).equal(1)
//             const _commitment = BigInt(signUpEvents[0]?.args?._identityCommitment)
//             expect(_commitment).equal(userCommitments[firstUser])
//             let startTime = new Date().getTime()
//             users[firstUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//                 JSON.parse(initUserState.toJSON())
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             expect(users[firstUser].latestTransitionedEpoch).equal(latestTransitionedToEpoch)
//             console.log(`First user signs up with commitment (${commitment}), in epoch ${users[firstUser].latestTransitionedEpoch} and GST leaf ${users[firstUser].latestGSTLeafIndex}`)
//             console.log('----------------------User State----------------------')
//             console.log(users[firstUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[firstUser].toJSON(4)
//         })
//         it('users sign up events', async () => {
//             const id = genIdentity()
//             const commitment = genIdentityCommitment(id)
//             userIds.push(id)
//             userCommitments.push(commitment)
//             const tx = await unirepContractCalledByAttester.userSignUp(commitment)
//             const receipt = await tx.wait()
//             expect(receipt.status, 'User sign up failed').to.equal(1)
//             users[secondUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[secondUser],
//             )
//             console.log('----------- second user state ---------------')
//             console.log(users[secondUser].toJSON(4))
//             console.log('----------- end of second user state ---------------')
//             secondUserState = users[secondUser].toJSON()
//         })
//     })
//     describe('Attestation submitted event', () => {
//         it('epoch key proof event', async () => {
//             const userState = genUserStateFromParams(
//                 userIds[secondUser],
//                 JSON.parse(secondUserState),
//             )
//             const epochKeyNonce = 2
//             const results = await userState.genVerifyEpochKeyProof(epochKeyNonce)
//             const isValid = await verifyProof(Circuit.verifyEpochKey, results.proof, results.publicSignals)
//             expect(isValid, 'Verify epk proof off-chain failed').to.be.true
//             const epochKeyProof = results.publicSignals.concat([formatProofForVerifierContract(results.proof)])
//             let tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
//             let receipt = await tx.wait()
//             expect(receipt.status).equal(1)
//             const proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
//             const proofIndex = await unirepContract.getProofIndex(proofNullifier)
//             expect(proofIndex.toNumber()).not.equal(0)
//             attesterId = BigInt(await unirepContract.attesters(attester['addr']))
//             const attestation: Attestation = new Attestation(
//                 attesterId,
//                 BigInt(3),
//                 BigInt(1),
//                 BigInt(0),
//                 BigInt(1),
//             )
//             tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 results.epochKey,
//                 proofIndex,
//                 { value: attestingFee }
//             )
//             receipt = await tx.wait()
//             expect(receipt.status, 'Submit attestation failed').to.equal(1)
//         })
//         it('restored user state should match the user state after epoch key proof event', async () => {
//             let startTime = new Date().getTime()
//             users[firstUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//                 JSON.parse(savedUserState)
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const unirepEpoch = await unirepContract.currentEpoch()
//             const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
//             expect(currentEpoch).equal(unirepEpoch)
//             console.log(`successfully update user state`)
//             console.log('----------------------User State----------------------')
//             console.log(users[firstUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[firstUser].toJSON(4)
//         })
//         it('reputation proof event', async () => {
//             const userState = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(savedUserState),
//             )
//             const epochKeyNonce = 1
//             const minRep = 0
//             const proveGraffiti = BigInt(0)
//             const graffitiPreimage = BigInt(0)
//             const nonceList = [BigInt(0), BigInt(1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1)]
//             const results = await userState.genProveReputationProof(attesterId, epochKeyNonce, minRep, proveGraffiti, graffitiPreimage, nonceList)
//             const isValid = await verifyProof(Circuit.proveReputation, results.proof, results.publicSignals)
//             expect(isValid, 'Verify epk proof off-chain failed').to.be.true
//             const reputationProof = [
//                 results.reputationNullifiers,
//                 results.epoch,
//                 results.epochKey,
//                 results.globalStatetreeRoot,
//                 results.attesterId,
//                 results.proveReputationAmount,
//                 results.minRep,
//                 results.proveGraffiti,
//                 results.graffitiPreImage,
//                 formatProofForVerifierContract(results.proof),
//             ]
//             const tx = await unirepContractCalledByAttester.spendReputation(reputationProof,{value: attestingFee}
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status, 'Submit reputation nullifiers failed').to.equal(1)
//             const proofNullifier = await unirepContract.hashReputationProof(reputationProof)
//             const proofIndex = await unirepContract.getProofIndex(proofNullifier)
//             expect(proofIndex.toNumber()).not.equal(0)
//         })
//         it('restored user state should match the user state after reputation proof event', async () => {
//             let startTime = new Date().getTime()
//             users[firstUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//                 JSON.parse(savedUserState)
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const unirepEpoch = await unirepContract.currentEpoch()
//             const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
//             expect(currentEpoch).equal(unirepEpoch)
//             console.log(`successfully update user state`)
//             console.log('----------------------User State----------------------')
//             console.log(users[firstUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[firstUser].toJSON(4)
//         })
//         it('airdrop proof event', async () => {
//             const userState = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(savedUserState),
//             )
//             const results = await userState.genUserSignUpProof(attesterId)
//             const isValid = await verifyProof(Circuit.proveUserSignUp, results.proof, results.publicSignals)
//             expect(isValid, 'Verify epk proof off-chain failed').to.be.true
//             const userSignUpProof = results.publicSignals.concat([formatProofForVerifierContract(results.proof)])
//             console.log('submite proof')
//             const tx = await unirepContractCalledByAttester.airdropEpochKey(userSignUpProof,{ value: attestingFee, gasLimit: 1000000 }
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status, 'Submit airdrop proof failed').to.equal(1)
//             console.log('get proof hash')
//             const proofNullifier = await unirepContract.hashSignUpProof(userSignUpProof)
//             const proofIndex = await unirepContract.getProofIndex(proofNullifier)
//             expect(proofIndex.toNumber()).not.equal(0)
//         })
//         it('restored user state should match the user state after airdrop proof event', async () => {
//             let startTime = new Date().getTime()
//             users[firstUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//                 JSON.parse(savedUserState)
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const unirepEpoch = await unirepContract.currentEpoch()
//             const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
//             expect(currentEpoch).equal(unirepEpoch)
//             console.log(`successfully update user state`)
//             console.log('----------------------User State----------------------')
//             console.log(users[firstUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[firstUser].toJSON(4)
//         })
//     })
//     describe('Epoch transition event', () => {
//         it('epoch transition', async () => {
//             // Fast-forward epochLength of seconds
//             await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
//             // Begin epoch transition
//             const tx = await unirepContract.beginEpochTransition()
//             const receipt = await tx.wait()
//             expect(receipt.status).equal(1)
//         })
//         it('restored user state should match the user state after epoch transition', async () => {
//             let startTime = new Date().getTime()
//             users[firstUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//                 JSON.parse(savedUserState)
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const epoch = 1
//             const epochTreeRoot = await users[firstUser].getUnirepStateEpochTree(epoch)
//             const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
//             expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
//             expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const unirepEpoch = await unirepContract.currentEpoch()
//             const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
//             expect(currentEpoch).equal(unirepEpoch)
//             console.log(`successfully update user state`)
//             console.log('----------------------User State----------------------')
//             console.log(users[firstUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[firstUser].toJSON(4)
//         })
//         it('user state transition', async () => {
//             const proofIndexes: ethers.BigNumber[] = []
//             const userState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             const results = await userState.genUserStateTransitionProofs()
//             let isValid = await verifyProof(Circuit.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
//             expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true
//             const blindedUserState = results.startTransitionProof.blindedUserState
//             const blindedHashChain = results.startTransitionProof.blindedHashChain
//             const globalStateTree = results.startTransitionProof.globalStateTreeRoot
//             const proof = formatProofForVerifierContract(results.startTransitionProof.proof)
//             let tx = await unirepContract.startUserStateTransition(
//                 blindedUserState,
//                 blindedHashChain,
//                 globalStateTree,
//                 proof,
//             )
//             let receipt = await tx.wait()
//             expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
//             console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())
//             let proofNullifier = await unirepContract.hashStartTransitionProof(
//                 blindedUserState,
//                 blindedHashChain,
//                 globalStateTree,
//                 proof
//             )
//             let proofIndex = await unirepContract.getProofIndex(proofNullifier)
//             proofIndexes.push(proofIndex)
//             for (let i = 0; i < results.processAttestationProofs.length; i++) {
//                 isValid = await verifyProof(Circuit.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
//                 expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true
//                 const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
//                 const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
//                 const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState
//                 // submit random process attestations should success and not affect the results
//                 const falseInput = genRandomSalt()
//                 tx = await unirepContract.processAttestations(
//                     outputBlindedUserState,
//                     outputBlindedHashChain,
//                     falseInput,
//                     formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//                 )
//                 receipt = await tx.wait()
//                 expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
//                 tx = await unirepContract.processAttestations(
//                     outputBlindedUserState,
//                     outputBlindedHashChain,
//                     inputBlindedUserState,
//                     formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//                 )
//                 receipt = await tx.wait()
//                 expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
//                 console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())
//                 const proofNullifier = await unirepContract.hashProcessAttestationsProof(
//                     outputBlindedUserState,
//                     outputBlindedHashChain,
//                     inputBlindedUserState,
//                     formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//                 )
//                 const proofIndex = await unirepContract.getProofIndex(proofNullifier)
//                 proofIndexes.push(proofIndex)
//             }
//             isValid = await verifyProof(Circuit.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
//             expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
//             const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf
//             const fromEpoch = results.finalTransitionProof.transitionedFromEpoch
//             const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
//             const blindedUserStates = results.finalTransitionProof.blindedUserStates
//             const blindedHashChains = results.finalTransitionProof.blindedHashChains
//             const epochTreeRoot = results.finalTransitionProof.fromEpochTree
//             const transitionProof = [
//                 newGSTLeaf,
//                 outputEpkNullifiers,
//                 fromEpoch,
//                 blindedUserStates,
//                 globalStateTree,
//                 blindedHashChains,
//                 epochTreeRoot,
//                 formatProofForVerifierContract(results.finalTransitionProof.proof),
//             ]
//             tx = await unirepContract.updateUserStateRoot(
//                 transitionProof, 
//                 proofIndexes,
//             )
//             receipt = await tx.wait()
//             expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
//             console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
//         })
//         it('restored user state should match the user state after user state transition', async () => {
//             let startTime = new Date().getTime()
//             users[firstUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[firstUser],
//                 JSON.parse(savedUserState)
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const epoch = 1
//             const epochTreeRoot = await users[firstUser].getUnirepStateEpochTree(epoch)
//             const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
//             expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[firstUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
//             expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const unirepEpoch = await unirepContract.currentEpoch()
//             const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
//             expect(currentEpoch).equal(unirepEpoch)
//             console.log(`successfully update user state`)
//             console.log('----------------------User State----------------------')
//             console.log(users[firstUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[firstUser].toJSON(4)
//         })
//         it('epoch transition', async () => {
//             // Fast-forward epochLength of seconds
//             await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
//             // Begin epoch transition
//             const tx = await unirepContract.beginEpochTransition()
//             const receipt = await tx.wait()
//             expect(receipt.status).equal(1)
//         })
//         it('restored user state should match the user state after user state transition', async () => {
//             let startTime = new Date().getTime()
//             users[secondUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[secondUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[secondUser],
//                 JSON.parse(secondUserState)
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const epoch = 1
//             const epochTreeRoot = await users[secondUser].getUnirepStateEpochTree(epoch)
//             const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
//             expect(restoredUserState.toJSON()).equal(users[secondUser].toJSON())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[secondUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
//             expect(restoredUserStateFromParams.toJSON()).equal(users[secondUser].toJSON())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const unirepEpoch = await unirepContract.currentEpoch()
//             const currentEpoch = users[secondUser].getUnirepStateCurrentEpoch()
//             expect(currentEpoch).equal(unirepEpoch)
//             console.log(`successfully update user state`)
//             console.log('----------------------User State----------------------')
//             console.log(users[secondUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[secondUser].toJSON(4)
//         })
//         it('user state transition', async () => {
//             const proofIndexes: ethers.BigNumber[] = []
//             const userState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[secondUser],
//             )
//             const results = await userState.genUserStateTransitionProofs()
//             let isValid = await verifyProof(Circuit.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
//             expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true
//             const blindedUserState = results.startTransitionProof.blindedUserState
//             const blindedHashChain = results.startTransitionProof.blindedHashChain
//             const globalStateTree = results.startTransitionProof.globalStateTreeRoot
//             const proof = formatProofForVerifierContract(results.startTransitionProof.proof)
//             let tx = await unirepContract.startUserStateTransition(
//                 blindedUserState,
//                 blindedHashChain,
//                 globalStateTree,
//                 proof,
//             )
//             let receipt = await tx.wait()
//             expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
//             console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())
//             let proofNullifier = await unirepContract.hashStartTransitionProof(
//                 blindedUserState,
//                 blindedHashChain,
//                 globalStateTree,
//                 proof
//             )
//             let proofIndex = await unirepContract.getProofIndex(proofNullifier)
//             proofIndexes.push(proofIndex)
//             for (let i = 0; i < results.processAttestationProofs.length; i++) {
//                 isValid = await verifyProof(Circuit.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
//                 expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true
//                 const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
//                 const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
//                 const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState
//                 // submit random process attestations should success and not affect the results
//                 const falseInput = genRandomSalt()
//                 tx = await unirepContract.processAttestations(
//                     outputBlindedUserState,
//                     outputBlindedHashChain,
//                     falseInput,
//                     formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//                 )
//                 receipt = await tx.wait()
//                 expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
//                 tx = await unirepContract.processAttestations(
//                     outputBlindedUserState,
//                     outputBlindedHashChain,
//                     inputBlindedUserState,
//                     formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//                 )
//                 receipt = await tx.wait()
//                 expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
//                 console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())
//                 const proofNullifier = await unirepContract.hashProcessAttestationsProof(
//                     outputBlindedUserState,
//                     outputBlindedHashChain,
//                     inputBlindedUserState,
//                     formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//                 )
//                 const proofIndex = await unirepContract.getProofIndex(proofNullifier)
//                 proofIndexes.push(proofIndex)
//             }
//             isValid = await verifyProof(Circuit.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
//             expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
//             const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf
//             const fromEpoch = results.finalTransitionProof.transitionedFromEpoch
//             const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
//             const blindedUserStates = results.finalTransitionProof.blindedUserStates
//             const blindedHashChains = results.finalTransitionProof.blindedHashChains
//             const epochTreeRoot = results.finalTransitionProof.fromEpochTree
//             const transitionProof = [
//                 newGSTLeaf,
//                 outputEpkNullifiers,
//                 fromEpoch,
//                 blindedUserStates,
//                 globalStateTree,
//                 blindedHashChains,
//                 epochTreeRoot,
//                 formatProofForVerifierContract(results.finalTransitionProof.proof),
//             ]
//             tx = await unirepContract.updateUserStateRoot(
//                 transitionProof, 
//                 proofIndexes,
//             )
//             receipt = await tx.wait()
//             expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
//             console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
//         })
//         it('restored user state should match the user state after user state transition', async () => {
//             let startTime = new Date().getTime()
//             users[secondUser] = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[secondUser],
//             )
//             let endTime = new Date().getTime()
//             console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             startTime = new Date().getTime()
//             const restoredUserState = await genUserStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//                 userIds[secondUser],
//                 JSON.parse(secondUserState)
//             )
//             endTime = new Date().getTime()
//             console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const epoch = 1
//             const epochTreeRoot = await users[secondUser].getUnirepStateEpochTree(epoch)
//             const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
//             expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())
//             startTime = new Date().getTime()
//             const restoredUserStateFromParams = genUserStateFromParams(
//                 userIds[secondUser],
//                 JSON.parse(restoredUserState.toJSON()),
//             )
//             const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
//             expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
//             endTime = new Date().getTime()
//             console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
//             const unirepEpoch = await unirepContract.currentEpoch()
//             const currentEpoch = users[secondUser].getUnirepStateCurrentEpoch()
//             expect(currentEpoch).equal(unirepEpoch)
//             console.log(`successfully update user state`)
//             console.log('----------------------User State----------------------')
//             console.log(users[secondUser].toJSON(4))
//             console.log('------------------------------------------------------')
//             savedUserState = users[secondUser].toJSON(4)
//         })
//     })
// })
