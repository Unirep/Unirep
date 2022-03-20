// import { ethers as hardhatEthers } from 'hardhat'
// import { BigNumber, ethers } from 'ethers'
// import chai from "chai"
// const { expect } = chai
// import { IncrementalMerkleTree, genRandomSalt, hashLeftRight, hashOne, ZkIdentity } from '@unirep/crypto'
// import { Circuit, formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
// import { deployUnirep } from '@unirep/contracts'

// import { genEpochKey, computeEmptyUserStateRoot, getTreeDepthsForTesting, genReputationNullifier } from '../../core/utils'
// import { toCompleteHexString, verifyNewGSTLeafEvents, verifyNewGSTProofByIndex } from '../utils'
// import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, epochLength, epochTreeDepth, maxAttesters, maxReputationBudget, maxUsers, numEpochKeyNoncePerEpoch} from '../../config/testLocal'
// import { Attestation, IAttestation, IUserStateLeaf, UnirepState, UserState, genUserStateFromContract, ISettings } from "../../core"


// describe('Integration', function () {
//     this.timeout(1000000)

//     let unirepState: UnirepState
//     let users: UserState[] = new Array(2)
//     let attesters = new Array(2)
//     let attesterSigs = new Array(2)
//     const firstUser = 0
//     const secondUser = 1
//     const firstAttester = 0
//     const secondAttester = 1
//     const signUpInLeaf = 1
//     const secondAttesterAirdropAmount = 20

//     // Data that are needed for verifying proof
//     let userStateLeavesAfterTransition: IUserStateLeaf[][] = new Array(2)
//     let graffitiPreImageMap = new Array(2)

//     let unirepContract: ethers.Contract
//     let unirepContractCalledByFirstAttester, unirepContractCalledBySecondAttester

//     let prevEpoch: ethers.BigNumber
//     let currentEpoch: ethers.BigNumber
//     let emptyUserStateRoot: BigInt
//     let blankGSLeaf: BigInt
//     let userStateTransitionedNum: {[key: number]: ethers.BigNumber[]} = {}
//     let epochKeys: {[key: string]: boolean} = {}
//     let validProofIndex: {[key: number]: boolean} = {}
//     let epochKeyProof
//     let epochKeyProofIndex: {[key: string]: ethers.BigNumber} = {}

//     let accounts: ethers.Signer[]

//     let duplicatedProofInputs

//     before(async () => {
//         accounts = await hardhatEthers.getSigners()

//         const _treeDepths = getTreeDepthsForTesting("circuit")
//         const _settings = {
//             maxUsers: maxUsers,
//             maxAttesters: maxAttesters,
//             numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
//             maxReputationBudget: maxReputationBudget,
//             epochLength: epochLength,
//             attestingFee: attestingFee
//         }
//         unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)

//         currentEpoch = await unirepContract.currentEpoch()
//         emptyUserStateRoot = computeEmptyUserStateRoot(circuitUserStateTreeDepth)

//         const setting: ISettings = {
//             globalStateTreeDepth: _treeDepths.globalStateTreeDepth,
//             userStateTreeDepth: _treeDepths.userStateTreeDepth,
//             epochTreeDepth: _treeDepths.epochTreeDepth,
//             attestingFee: attestingFee,
//             epochLength: epochLength,
//             numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
//             maxReputationBudget: maxReputationBudget,
//         }
//         unirepState = new UnirepState(setting)
//     })

//     describe('First epoch', () => {
//         it('First user signs up', async () => {
//             const id = new ZkIdentity()
//             const commitment = id.genIdentityCommitment()

//             const tx = await unirepContract.userSignUp(commitment)
//             const receipt = await tx.wait()
//             expect(receipt.status, 'User sign up failed').to.equal(1)

//             const hashedStateLeaf = hashLeftRight(commitment, emptyUserStateRoot)
//             unirepState.signUp(currentEpoch.toNumber(), hashedStateLeaf)
//             users[firstUser] = new UserState(
//                 unirepState,
//                 id,
//                 false,
//             )
//             const latestTransitionedToEpoch = currentEpoch.toNumber()
//             const GSTreeLeafIndex = 0
//             users[firstUser].signUp(latestTransitionedToEpoch, GSTreeLeafIndex, 0, 0)
//             console.log(`First user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
//             console.log('----------------------User State----------------------')
//             console.log(users[firstUser].toJSON(4))
//             console.log('------------------------------------------------------')
//         })

//     //     it('First attester signs up', async () => {
//     //         attesters[firstAttester] = new Object()
//     //         attesters[firstAttester]['acct'] = accounts[1]
//     //         attesters[firstAttester]['addr'] = await attesters[firstAttester]['acct'].getAddress()
//     //         unirepContractCalledByFirstAttester = unirepContract.connect(attesters[firstAttester]['acct'])

//     //         const tx = await unirepContractCalledByFirstAttester.attesterSignUp()
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Attester sign up failed').to.equal(1)
            
//     //         attesters[firstAttester].id = BigInt(await unirepContract.attesters(attesters[firstAttester]['addr']))
//     //         console.log(`First attester signs up, attester id: ${attesters[firstAttester].id}`)
//     //     })

//     //     it('Global state tree built from events should match', async () => {
//     //         const newLeaves: BigInt[] = await verifyNewGSTLeafEvents(unirepContract, currentEpoch)

//     //         let observedGST = new IncrementalMerkleTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
//     //         for(let leaf of newLeaves) {
//     //             observedGST.insert(leaf)
//     //         }
//     //         expect(observedGST.root, 'GST root mismatch').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
//     //     })
//     // })

//     // // No attestations made during first epoch
//     // // First user transitioned from epoch with no attestations

//     // describe('Second epoch', () => {
//     //     const secondEpochEpochKeys: string[] = []
//     //     let attestationsFromFirstAttester: number = 0
//     //     let attestationsFromSecondAttester: number = 0
//     //     it('begin first epoch epoch transition', async () => {
//     //         prevEpoch = currentEpoch
//     //         // Fast-forward epochLength of seconds
//     //         await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
//     //         // Begin epoch transition
//     //         let tx = await unirepContract.beginEpochTransition()
//     //         let receipt = await tx.wait()
//     //         expect(receipt.status, 'Epoch transition failed').to.equal(1)
//     //         console.log(`Gas cost of epoch transition: ${receipt.gasUsed.toString()}`)

//     //         currentEpoch = await unirepContract.currentEpoch()
//     //         expect(currentEpoch, 'Current epoch should be 2').to.equal(2)

//     //         await unirepState.epochTransition(prevEpoch.toNumber())
//     //         console.log('----------------------Unirep State----------------------')
//     //         console.log(unirepState.toJSON(4))
//     //         console.log('------------------------------------------------------')

//     //         userStateTransitionedNum[currentEpoch.toNumber()] = []
//     //     })

//     //     it('First user transition from first epoch', async () => {
//     //         const fromEpoch = users[firstUser].latestTransitionedEpoch
//     //         const fromEpochGSTree: IncrementalMerkleTree = unirepState.genGSTree(fromEpoch)
//     //         const GSTreeRoot = fromEpochGSTree.root
//     //         const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
//     //         const epochTreeRoot = fromEpochTree.getRootHash()
//     //         const epkNullifiers = users[firstUser].getEpochKeyNullifiers(fromEpoch)
//     //         const proofIndexes: BigInt[] = []
//     //         console.log('Processing first user\'s transition: ')
//     //         console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}`)
//     //         console.log(`and epkNullifiers [${epkNullifiers}]`)

//     //         const results = await users[firstUser].genUserStateTransitionProofs()
//     //         let isValid = await verifyProof(Circuit.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
//     //         expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

//     //         const blindedUserState = results.startTransitionProof.blindedUserState
//     //         const blindedHashChain = results.startTransitionProof.blindedHashChain
//     //         const globalStateTree = results.startTransitionProof.globalStateTreeRoot
//     //         const proof = formatProofForVerifierContract(results.startTransitionProof.proof)
//     //         let tx = await unirepContract.startUserStateTransition(
//     //             blindedUserState,
//     //             blindedHashChain,
//     //             globalStateTree,
//     //             proof,
//     //         )
//     //         let receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
//     //         console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())

//     //         let proofNullifier = computeStartTransitionProofHash(
//     //             blindedUserState,
//     //             blindedHashChain,
//     //             GSTreeRoot,
//     //             proof
//     //         )
//     //         let proofIndex = await unirepContract.getProofIndex(proofNullifier)
//     //         proofIndexes.push(BigInt(proofIndex))

//     //         for (let i = 0; i < results.processAttestationProofs.length; i++) {
//     //             isValid = await verifyProof(Circuit.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
//     //             expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

//     //             const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
//     //             const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
//     //             const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

//     //             // submit random process attestations should success and not affect the results
//     //             const falseInput = genRandomSalt()
//     //             tx = await unirepContract.processAttestations(
//     //                 outputBlindedUserState,
//     //                 outputBlindedHashChain,
//     //                 falseInput,
//     //                 formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//     //             )
//     //             receipt = await tx.wait()
//     //             expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)

//     //             tx = await unirepContract.processAttestations(
//     //                 outputBlindedUserState,
//     //                 outputBlindedHashChain,
//     //                 inputBlindedUserState,
//     //                 formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//     //             )
//     //             receipt = await tx.wait()
//     //             expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
//     //             console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())

//     //             const proofNullifier = computeProcessAttestationsProofHash(
//     //                 outputBlindedUserState,
//     //                 outputBlindedHashChain,
//     //                 inputBlindedUserState,
//     //                 formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//     //             )
//     //             const proofIndex = await unirepContract.getProofIndex(proofNullifier)
//     //             proofIndexes.push(BigInt(proofIndex))
//     //         }

//     //         isValid = await verifyProof(Circuit.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
//     //         expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
//     //         const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf

//     //         const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
//     //         const blindedUserStates = results.finalTransitionProof.blindedUserStates
//     //         const blindedHashChains = results.finalTransitionProof.blindedHashChains

//     //         // Verify new state state outputted by circuit is the same as the one computed off-chain
//     //         users[firstUser].saveAttestations()
//     //         const newState = await users[firstUser].genNewUserStateAfterTransition()
//     //         expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf.toString())
//     //         userStateLeavesAfterTransition[firstUser] = newState.newUSTLeaves
//     //         userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)

//     //         const transitionProof = [
//     //             newGSTLeaf,
//     //             outputEpkNullifiers,
//     //             fromEpoch,
//     //             blindedUserStates,
//     //             GSTreeRoot,
//     //             blindedHashChains,
//     //             epochTreeRoot,
//     //             formatProofForVerifierContract(results.finalTransitionProof.proof),
//     //         ]

//     //         tx = await unirepContract.updateUserStateRoot(
//     //             transitionProof, 
//     //             proofIndexes,
//     //         )
//     //         receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
//     //         console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
//     //     })

//     //     it('Verify state transition of first user\'s epoch transition', async () => {
//     //         const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
//     //         const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
//     //         expect(newLeafEvents.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

//     //         const proofIndex = newLeafEvents[0]?.args?._proofIndex
//     //         const isValidEvent = await verifyNewGSTProofByIndex(unirepContract, proofIndex)
//     //         expect(isValidEvent).not.equal(undefined)
//     //         expect(isValidEvent?.event).equal("UserStateTransitionProof")
//     //         const newLeaf = BigInt(newLeafEvents[0].args?._hashedLeaf)
//     //         validProofIndex[proofIndex.toNumber()] = true
            
//     //         const epkNullifiers = isValidEvent?.args?.userTransitionedData?.epkNullifiers
//     //         const _newGlobalStateTreeLeaf = isValidEvent?.args?.userTransitionedData?.newGlobalStateTreeLeaf
//     //         expect(newLeaf).equal(_newGlobalStateTreeLeaf)

//     //         const latestUserStateLeaves = userStateLeavesAfterTransition[firstUser]  // Leaves should be empty as no reputations are given yet
//     //         users[firstUser].transition(latestUserStateLeaves)
//     //         console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
//     //         expect(users[firstUser].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

//     //         unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(_newGlobalStateTreeLeaf), epkNullifiers)
//     //         console.log('User state transition off-chain: ')
//     //         console.log(`newGSTLeaf ${BigInt(_newGlobalStateTreeLeaf)} and epk nullifier ${epkNullifiers}`)
//     //         console.log('----------------------User State----------------------')
//     //         console.log(users[firstUser].toJSON(4))
//     //         console.log('------------------------------------------------------')
//     //     })

//     //     it('Second attester signs up', async () => {
//     //         attesters[secondAttester] = new Object()
//     //         attesters[secondAttester]['acct'] = accounts[2]
//     //         attesters[secondAttester]['addr'] = await attesters[secondAttester]['acct'].getAddress()
//     //         unirepContractCalledBySecondAttester = unirepContract.connect(attesters[secondAttester]['acct'])
//     //         const message = ethers.utils.solidityKeccak256(["address", "address"], [attesters[secondAttester]['addr'], unirepContract.address])
//     //         attesterSigs[secondAttester] = await attesters[secondAttester]['acct'].signMessage(ethers.utils.arrayify(message))
//     //         const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Attester signs up failed').to.equal(1)

//     //         attesters[secondAttester].id = BigInt(await unirepContract.attesters(attesters[secondAttester]['addr']))
//     //         console.log(`First attester signs up, attester id: ${attesters[secondAttester].id}`)
//     //     })

//     //     it('Second attester set airdrop positive reputation', async () => {
//     //         unirepContractCalledBySecondAttester = unirepContract.connect(attesters[secondAttester]['acct'])
//     //         const tx = await unirepContractCalledBySecondAttester.setAirdropAmount(secondAttesterAirdropAmount)
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Attester sets airdrop amount failed').to.equal(1)

//     //         const _airdroppedAmount = await unirepContract.airdropAmount(attesters[secondAttester]['addr'])
//     //         expect(_airdroppedAmount, 'airdrop amount is incorrectly stored on-chain').to.equal(ethers.BigNumber.from(secondAttesterAirdropAmount))
//     //     })

//     //     it('Second user signs up through second attester should get airdrop positive reputation', async () => {
//     //         const id = new ZkIdentity()
//     //         const commitment = id.genIdentityCommitment()

//     //         const tx = await unirepContractCalledBySecondAttester.userSignUp(commitment)
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'User sign up failed').to.equal(1)

//     //         const hashedLeaf = await unirepContract.hashAirdroppedLeaf(secondAttesterAirdropAmount)
//     //         const secondAttesterId = await unirepContract.attesters(attesters[secondAttester]['addr'])
//     //         const airdroppedUSTRoot = await unirepContract.calcAirdropUSTRoot(secondAttesterId, hashedLeaf)
//     //         const hashedStateLeaf = await unirepContract.hashStateLeaf([commitment, airdroppedUSTRoot])
//     //         unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
//     //         users[secondUser] = new UserState(
//     //             unirepState,
//     //             id,
//     //             false,
//     //         )
//     //         const latestTransitionedToEpoch = currentEpoch.toNumber()
//     //         const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
//     //         const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
//     //         let GSTreeLeafIndex: number = -1

//     //         for(const event of newLeafEvents){
//     //             const args = event?.args
//     //             const proofIndex = args?._proofIndex
//     //             if (validProofIndex[proofIndex.toNumber()]) GSTreeLeafIndex ++
                
//     //             // New leaf events are from user sign up and user state transition
//     //             // 1. check user sign up
//     //             const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
//     //             const signUpEvents = await unirepContract.queryFilter(signUpFilter)
//     //             // found user sign up event, then continue
//     //             if (signUpEvents.length == 1) {
//     //                 GSTreeLeafIndex ++
//     //                 if(BigInt(signUpEvents[0]?.args?._identityCommitment) == commitment) {
//     //                     expect(signUpEvents[0]?.args?._attesterId.toNumber()).equal(secondAttesterId)
//     //                     expect(signUpEvents[0]?.args?._airdropAmount.toNumber()).equal(secondAttesterAirdropAmount)
//     //                     break
//     //                 }
//     //                 validProofIndex[proofIndex.toNumber()] = true
//     //                 continue
//     //             }
//     //         }
//     //         expect(GSTreeLeafIndex).to.equal(1)

//     //         users[secondUser].signUp(latestTransitionedToEpoch, GSTreeLeafIndex, secondAttesterId.toNumber(), secondAttesterAirdropAmount)
//     //         console.log(`Second user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
//     //         console.log('----------------------User State----------------------')
//     //         console.log(users[secondUser].toJSON(4))
//     //         console.log('------------------------------------------------------')
//     //     })

//     //     it('Second user can generate a reputation proof with the airdropped amount', async () => {
//     //         const secondAttesterId = attesters[secondAttester].id
//     //         const epkNonce = 1
//     //         const epochKey = genEpochKey(users[secondUser].id.getNullifier(), currentEpoch.toNumber(), epkNonce)
//     //         const minRep = BigInt(secondAttesterAirdropAmount)
//     //         const proveGraffiti = BigInt(0)
//     //         const graffitiPreImage = genRandomSalt()
//     //         const results = await users[secondUser].genProveReputationProof(secondAttesterId, epkNonce, minRep, proveGraffiti, graffitiPreImage)
//     //         const isValid = await verifyProof(Circuit.proveReputation, results.proof, results.publicSignals)
//     //         expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

//     //         const GSTreeRoot = unirepState.genGSTree(currentEpoch.toNumber()).root
//     //         const isProofValid = await unirepContract.verifyReputation(
//     //             results.reputationNullifiers,
//     //             results.epoch,
//     //             results.epochKey,
//     //             results.globalStatetreeRoot,
//     //             results.attesterId,
//     //             results.proveReputationAmount,
//     //             results.minRep,
//     //             results.proveGraffiti,
//     //             results.graffitiPreImage,
//     //             formatProofForVerifierContract(results.proof),
//     //         )
//     //         expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
//     //         console.log(`Proving reputation from attester ${secondAttesterId.toString()} with minRep ${secondAttesterAirdropAmount}`)
//     //     })

//     //     it('Second user can generate a sign up proof', async () => {
//     //         const secondAttesterId = attesters[secondAttester].id
//     //         // user sign up proof uses a fixed epk nonce
//     //         const epkNonce = 0
//     //         const epochKey = genEpochKey(users[secondUser].id.getNullifier(), currentEpoch.toNumber(), epkNonce)
//     //         const results = await users[secondUser].genUserSignUpProof(secondAttesterId)
//     //         const isValid = await verifyProof(Circuit.proveUserSignUp, results.proof, results.publicSignals)
//     //         expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

//     //         const GSTreeRoot = unirepState.genGSTree(currentEpoch.toNumber()).root
//     //         const isProofValid = await unirepContract.verifyUserSignUp(
//     //             results.epoch,
//     //             results.epochKey,
//     //             results.globalStateTreeRoot,
//     //             results.attesterId,
//     //             results.userHasSignedUp,
//     //             formatProofForVerifierContract(results['proof']),
//     //         )
//     //         expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
//     //         console.log(`Proving user has signed up in attester ${secondAttesterId.toString()}\'s leaf`)
//     //     })

//     //     it('Second user can generate reputation nullifiers proof and should be submitted successfully', async () => {
//     //         const secondAttesterId = attesters[secondAttester].id
//     //         const epkNonce = 1
//     //         const epochKey = genEpochKey(users[secondUser].id.getNullifier(), currentEpoch.toNumber(), epkNonce)
//     //         const minRep = BigInt(secondAttesterAirdropAmount)
//     //         const proveGraffiti = BigInt(0)
//     //         const graffitiPreImage = genRandomSalt()
//     //         const repNullifiersAmount = 5
//     //         const nonceList: BigInt[] = []
//     //         for (let i = 0; i < maxReputationBudget; i++) {
//     //             if(i < repNullifiersAmount){
//     //                 if(!unirepState.nullifierExist(genReputationNullifier(users[secondUser].id.getNullifier(), currentEpoch.toNumber(), i, secondAttesterId)))
//     //                     nonceList.push(BigInt(i))
//     //             } else 
//     //                 nonceList.push(BigInt(-1))
                
//     //         }
//     //         const results = await users[secondUser].genProveReputationProof(secondAttesterId, epkNonce, minRep, proveGraffiti, graffitiPreImage, nonceList)
//     //         const isValid = await verifyProof(Circuit.proveReputation, results.proof, results.publicSignals)
//     //         expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

//     //         const GSTreeRoot = unirepState.genGSTree(currentEpoch.toNumber()).root
//     //         const isProofValid = await unirepContract.verifyReputation(
//     //             results.reputationNullifiers,
//     //             results.epoch,
//     //             results.epochKey,
//     //             results.globalStatetreeRoot,
//     //             results.attesterId,
//     //             results.proveReputationAmount,
//     //             results.minRep,
//     //             results.proveGraffiti,
//     //             results.graffitiPreImage,
//     //             formatProofForVerifierContract(results.proof),
//     //         )
//     //         expect(isProofValid, 'Verify reputation on-chain failed').to.be.true

//     //         const tx = await unirepContractCalledBySecondAttester.spendReputation([
//     //             results.reputationNullifiers,
//     //             results.epoch,
//     //             results.epochKey,
//     //             results.globalStatetreeRoot,
//     //             results.attesterId,
//     //             results.proveReputationAmount,
//     //             results.minRep,
//     //             results.proveGraffiti,
//     //             results.graffitiPreImage,
//     //             formatProofForVerifierContract(results.proof),
//     //             ],{value: attestingFee}
//     //         )
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit reputation nullifiers failed').to.equal(1)

//     //         const repNullifiers = results.reputationNullifiers.slice(0, repNullifiersAmount)
//     //         console.log(`Proving reputation from attester ${secondAttesterId.toString()} with minRep ${secondAttesterAirdropAmount} and ${repNullifiersAmount} nullifiers [${repNullifiers.map(l => l.toString())}]`)
//     //     })

//     //     it('Verify reputation nullifiers and proof should succeed', async () => {
//     //         const repNullifiersFilter = unirepContract.filters.ReputationNullifierProof()
//     //         const repNullifiersEvent = await unirepContract.queryFilter(repNullifiersFilter)

//     //         const repNullifiersArgs: any = repNullifiersEvent[0]?.args?.reputationProofData
//     //         let nullifiersAmount = 0
//     //         for (let i = 0; i < repNullifiersArgs.repNullifiers.length; i++) {
//     //             if(repNullifiersArgs.repNullifiers[i] != BigInt(0)){
//     //                 nullifiersAmount ++
//     //             }
//     //         }

//     //         // Verify on-chain
//     //         const isProofValid = await unirepContract.verifyReputation(
//     //             repNullifiersArgs.repNullifiers,
//     //             repNullifiersArgs.epoch,
//     //             repNullifiersArgs.epochKey,
//     //             repNullifiersArgs.globalStateTree,
//     //             repNullifiersArgs.attesterId,
//     //             repNullifiersArgs.proveReputationAmount,
//     //             repNullifiersArgs.minRep,
//     //             repNullifiersArgs.proveGraffiti,
//     //             repNullifiersArgs.graffitiPreImage,
//     //             repNullifiersArgs.proof,
//     //         )
//     //         expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true
            
//     //         for (let nullifier of repNullifiersArgs.repNullifiers) {
//     //             unirepState.addReputationNullifiers(BigInt(nullifier))
//     //         }

//     //         // add a negative reputation
//     //         const attestation = new Attestation(
//     //             BigInt(repNullifiersArgs.attesterId),
//     //             BigInt(0),
//     //             BigInt(nullifiersAmount),
//     //             BigInt(0),
//     //             BigInt(0)
//     //         )
//     //         const epochKey = repNullifiersArgs.epochKey
//     //         attestationsFromSecondAttester ++
//     //         unirepState.addAttestation(epochKey.toString(), attestation)

//     //         console.log('----------------------Unirep State----------------------')
//     //         console.log(unirepState.toJSON(4))
//     //         console.log('------------------------------------------------------')
//     //     })

//     //     it('Verify epoch key of first user', async () => {
//     //         const epochKeyNonce = 0
//     //         const results = await users[firstUser].genVerifyEpochKeyProof(epochKeyNonce)
//     //         const isValid = await verifyProof(Circuit.verifyEpochKey, results.proof, results.publicSignals)
//     //         expect(isValid, 'Verify epk proof off-chain failed').to.be.true
            
//     //         // Verify on-chain
//     //         const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
//     //         const firstUserEpochKey = genEpochKey(users[firstUser].id.getNullifier(), currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
//     //         epochKeyProof = results.publicSignals.concat([formatProofForVerifierContract(results.proof)])
//     //         const isProofValid = await unirepContract.verifyEpochKeyValidity(
//     //             results.globalStateTree,
//     //             results.epoch,
//     //             results.epochKey,
//     //             formatProofForVerifierContract(results.proof),
//     //         )
//     //         console.log(`Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
//     //         expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
//     //     })

//     //     it('submit first user\'s first epoch key', async () => {
//     //         const tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status).equal(1)

//     //         const proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
//     //         epochKeyProofIndex[epochKeyProof[2]] = await unirepContract.getProofIndex(proofNullifier)
//     //     })

//     //     it('First attester attest to first user\'s first epoch key', async () => {
//     //         const nonce = 0
//     //         const firstUserEpochKey = genEpochKey(users[firstUser].id.getNullifier(), currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
//     //         const graffitiPreImage = genRandomSalt()
//     //         const attestation: Attestation = new Attestation(
//     //             attesters[firstAttester].id,
//     //             BigInt(3),
//     //             BigInt(1),
//     //             hashOne(graffitiPreImage),
//     //             BigInt(signUpInLeaf),
//     //         )
//     //         // Add graffiti pre-image to graffitiPreImageMap
//     //         graffitiPreImageMap[firstUser] = new Object()
//     //         graffitiPreImageMap[firstUser][attestation.attesterId.toString()] = graffitiPreImage
//     //         console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)
//     //         const tx = await unirepContractCalledByFirstAttester.submitAttestation(
//     //             attestation,
//     //             firstUserEpochKey,
//     //             epochKeyProofIndex[firstUserEpochKey.toString()],
//     //             { value: attestingFee }
//     //         )
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit attestation failed').to.equal(1)

//     //         secondEpochEpochKeys.push(firstUserEpochKey.toString())
//     //         epochKeys[firstUserEpochKey.toString()] = true
//     //         attestationsFromFirstAttester ++
//     //         unirepState.addAttestation(firstUserEpochKey.toString(), attestation)
//     //     })

//     //     it('submit first user\'s second epoch key', async () => {
//     //         const nonce = 1
//     //         const results = await users[firstUser].genVerifyEpochKeyProof(nonce)
//     //         epochKeyProof = results.publicSignals.concat([formatProofForVerifierContract(results.proof)])

//     //         const tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status).equal(1)

//     //         const proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
//     //         epochKeyProofIndex[epochKeyProof[2]] = await unirepContract.getProofIndex(proofNullifier)
//     //     })

//     //     it('First attester attest to first user\'s second epoch key', async () => {
//     //         const nonce = 1
//     //         const firstUserEpochKey = genEpochKey(users[firstUser].id.getNullifier(), currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
//     //         const graffitiPreImage = genRandomSalt()
//     //         const attestation: Attestation = new Attestation(
//     //             attesters[firstAttester].id,
//     //             BigInt(5),
//     //             BigInt(1),
//     //             hashOne(graffitiPreImage),
//     //             BigInt(signUpInLeaf),
//     //         )
//     //         // update graffiti pre-image in graffitiPreImageMap
//     //         graffitiPreImageMap[firstUser][attestation.attesterId.toString()] = graffitiPreImage
//     //         console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)
//     //         const tx = await unirepContractCalledByFirstAttester.submitAttestation(
//     //             attestation,
//     //             firstUserEpochKey,
//     //             epochKeyProofIndex[firstUserEpochKey.toString()],
//     //             { value: attestingFee }
//     //         )
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit attestation failed').to.equal(1)

//     //         secondEpochEpochKeys.push(firstUserEpochKey.toString())
//     //         epochKeys[firstUserEpochKey.toString()] = true
//     //         attestationsFromFirstAttester ++
//     //         unirepState.addAttestation(firstUserEpochKey.toString(), attestation)
//     //     })

//     //     it('Second attester attest to first user', async () => {
//     //         const nonce = 0
//     //         const firstUserEpochKey = genEpochKey(users[firstUser].id.getNullifier(), currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            
//     //         const graffitiPreImage = genRandomSalt()
//     //         const attestation: Attestation = new Attestation(
//     //             attesters[secondAttester].id,
//     //             BigInt(3),
//     //             BigInt(1),
//     //             hashOne(graffitiPreImage),
//     //             BigInt(signUpInLeaf),
//     //         )
//     //         // Add graffiti pre-image to graffitiPreImageMap
//     //         graffitiPreImageMap[firstUser][attestation.attesterId.toString()] = graffitiPreImage
//     //         console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)

//     //         const tx = await unirepContractCalledBySecondAttester.submitAttestation(
//     //             attestation,
//     //             firstUserEpochKey,
//     //             epochKeyProofIndex[firstUserEpochKey.toString()],
//     //             { value: attestingFee }
//     //         )
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit attestation failed').to.equal(1)

//     //         attestationsFromSecondAttester ++
//     //         unirepState.addAttestation(firstUserEpochKey.toString(), attestation)
//     //     })

//     //     it('Verify epoch key of second user', async () => {
//     //         const epochKeyNonce = 0
//     //         const results = await users[secondUser].genVerifyEpochKeyProof(epochKeyNonce)
//     //         const isValid = await verifyProof(Circuit.verifyEpochKey, results.proof, results.publicSignals)
//     //         expect(isValid, 'Verify epk proof off-chain failed').to.be.true
            
//     //         // Verify on-chain
//     //         const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
//     //         const secondUserEpochKey = genEpochKey(users[secondUser].id.getNullifier(), currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
//     //         epochKeyProof = results.publicSignals.concat([formatProofForVerifierContract(results.proof)])
//     //         const isProofValid = await unirepContract.verifyEpochKeyValidity(
//     //             results.globalStateTree,
//     //             results.epoch,
//     //             results.epochKey,
//     //             formatProofForVerifierContract(results.proof),
//     //         )
//     //         console.log(`Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${secondUserEpochKey}`)
//     //         expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
//     //     })

//     //     it('submit second user\'s first epoch key', async () => {
//     //         const tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status).equal(1)

//     //         const proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
//     //         epochKeyProofIndex[epochKeyProof[2]] = await unirepContract.getProofIndex(proofNullifier)
//     //     })

//     //     it('First attester attest to second user', async () => {
//     //         const nonce = 0
//     //         const secondUserEpochKey = genEpochKey(users[secondUser].id.getNullifier(), currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
//     //         const graffitiPreImage = genRandomSalt()
//     //         const attestation: Attestation = new Attestation(
//     //             attesters[firstAttester].id,
//     //             BigInt(2),
//     //             BigInt(6),
//     //             hashOne(graffitiPreImage),
//     //             BigInt(signUpInLeaf),
//     //         )
//     //         // Add graffiti pre-image to graffitiPreImageMap
//     //         graffitiPreImageMap[secondUser] = new Object()
//     //         graffitiPreImageMap[secondUser][attestation.attesterId.toString()] = graffitiPreImage
//     //         console.log(`Attester attest to epk ${secondUserEpochKey} with ${attestation.toJSON()}`)
//     //         const tx = await unirepContractCalledByFirstAttester.submitAttestation(
//     //             attestation,
//     //             secondUserEpochKey,
//     //             epochKeyProofIndex[secondUserEpochKey.toString()],
//     //             { value: attestingFee }
//     //         )
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit attestation failed').to.equal(1)

//     //         secondEpochEpochKeys.push(secondUserEpochKey.toString())
//     //         epochKeys[secondUserEpochKey.toString()] = true
//     //         attestationsFromFirstAttester ++
//     //         unirepState.addAttestation(secondUserEpochKey.toString(), attestation)
//     //     })

//     //     it('Second attester attest to second user', async () => {
//     //         const nonce = 0
//     //         const secondUserEpochKey = genEpochKey(users[secondUser].id.getNullifier(), currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)

//     //         const graffitiPreImage = genRandomSalt()
//     //         const attestation: Attestation = new Attestation(
//     //             attesters[secondAttester].id,
//     //             BigInt(0),
//     //             BigInt(3),
//     //             hashOne(graffitiPreImage),
//     //             BigInt(signUpInLeaf),
//     //         )
//     //         // Add graffiti pre-image to graffitiPreImageMap
//     //         graffitiPreImageMap[secondUser][attestation.attesterId.toString()] = graffitiPreImage
//     //         console.log(`Attester attest to epk ${secondUserEpochKey} with ${attestation.toJSON()}`)
//     //         const tx = await unirepContractCalledBySecondAttester.submitAttestation(
//     //             attestation,
//     //             secondUserEpochKey,
//     //             epochKeyProofIndex[secondUserEpochKey.toString()],
//     //             { value: attestingFee }
//     //         )
//     //         const receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit attestation failed').to.equal(1)

//     //         attestationsFromSecondAttester ++
//     //         unirepState.addAttestation(secondUserEpochKey.toString(), attestation)
//     //     })

//     //     it('Attestations gathered from events should match', async () => {
//     //         // First filter by epoch
//     //         const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
//     //         const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
//     //         const attestationNum = attestationsFromFirstAttester + attestationsFromSecondAttester
//     //         expect(attestationsByEpochEvent.length, `Number of attestations submitted should be ${attestationNum}`).to.equal(attestationNum)

//     //         // Second filter by attester
//     //         for (let attester of attesters) {
//     //             let attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, attester['addr'])
//     //             let attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
//     //             if (attester.id == attesters[firstAttester].id) {
//     //                 expect(attestationsByAttesterEvent.length, `Number of attestations from first attester should be ${attestationsFromFirstAttester}`).to.equal(attestationsFromFirstAttester)
//     //             } else if (attester.id == attesters[secondAttester].id) {
//     //                 expect(attestationsByAttesterEvent.length, `Number of attestations from second attester should be ${attestationsFromSecondAttester}`).to.equal(attestationsFromSecondAttester)
//     //             } else {
//     //                 throw new Error(`Invalid attester id ${attester.id}`)
//     //             }
//     //         }

//     //         // Last filter by epoch key
//     //         for (let epochKey of secondEpochEpochKeys) {
//     //             const epkInHexStr = toCompleteHexString(BigInt(epochKey).toString(16), 32)
//     //             let attestationsByEpochKeyFilter = unirepContract.filters.AttestationSubmitted(null, epkInHexStr)
//     //             let attestationsByEpochKeyEvent = await unirepContract.queryFilter(attestationsByEpochKeyFilter)
//     //             let attestations_: IAttestation[] = attestationsByEpochKeyEvent.map((event: any) => event['args']['attestation'])

//     //             let attestations: IAttestation[] = unirepState.getAttestations(epochKey)
//     //             expect(attestationsByEpochKeyEvent.length, `Number of attestations to epk ${epochKey} should be ${attestations.length}`).to.equal(attestations.length)

//     //             for (let i = 0; i < attestations_.length; i++) {
//     //                 console.log(`Comparing attestation ${i} attesting to epk ${epochKey}`)
//     //                 expect(attestations[i]['attesterId'], 'Mismatched attesterId').to.equal(attestations_[i]['attesterId'])
//     //                 expect(attestations[i]['posRep'], 'Mismatched posRep').to.equal(attestations_[i]['posRep'])
//     //                 expect(attestations[i]['negRep'], 'Mismatched negRep').to.equal(attestations_[i]['negRep'])
//     //                 expect(attestations[i]['graffiti'], 'Mismatched graffiti').to.equal(attestations_[i]['graffiti'])
//     //             }
//     //         }
//     //     })

//     //     it('Global state tree built from events should match', async () => {
//     //         const newLeaves: BigInt[] = await verifyNewGSTLeafEvents(unirepContract, currentEpoch)

//     //         let observedGST = new IncrementalMerkleTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
//     //         for(let leaf of newLeaves) {
//     //             // Only insert non-zero leaf
//     //             if (leaf > BigInt(0)) observedGST.insert(leaf)
//     //         }
//     //         expect(observedGST.root, 'GSTreeRoot mismatched').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
//     //     })
//     // })

//     // describe('Third epoch', () => {
//     //     it('begin second epoch epoch transition', async () => {
//     //         prevEpoch = currentEpoch
//     //         // Fast-forward epochLength of seconds
//     //         await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
//     //         // Begin epoch transition
//     //         let tx = await unirepContract.beginEpochTransition()
//     //         let receipt = await tx.wait()
//     //         expect(receipt.status, 'Epoch transition failed').to.equal(1)
//     //         console.log(`Gas cost of epoch transition: ${receipt.gasUsed.toString()}`)

//     //         currentEpoch = await unirepContract.currentEpoch()
//     //         expect(currentEpoch, 'Current epoch should be 3').to.equal(3)

//     //         await unirepState.epochTransition(prevEpoch.toNumber())
//     //         console.log('----------------------Unirep State----------------------')
//     //         console.log(unirepState.toJSON(4))
//     //         console.log('------------------------------------------------------')

//     //         userStateTransitionedNum[currentEpoch.toNumber()] = []
//     //     })

//     //     it('First user transition from second epoch', async () => {
//     //         const fromEpoch = users[firstUser].latestTransitionedEpoch
//     //         const fromEpochGSTree: IncrementalMerkleTree = unirepState.genGSTree(fromEpoch)
//     //         const GSTreeRoot = fromEpochGSTree.root
//     //         const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
//     //         const epochTreeRoot = fromEpochTree.getRootHash()
//     //         const epkNullifiers = users[firstUser].getEpochKeyNullifiers(fromEpoch)
//     //         const proofIndexes: BigInt[] = []
//     //         console.log('Processing first user\'s transition: ')
//     //         console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}`)
//     //         console.log(`and epkNullifiers [${epkNullifiers}]`)

//     //         const results = await users[firstUser].genUserStateTransitionProofs()
//     //         let isValid = await verifyProof(Circuit.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
//     //         expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

//     //         const blindedUserState = results.startTransitionProof.blindedUserState
//     //         const blindedHashChain = results.startTransitionProof.blindedHashChain
//     //         // const GSTreeRoot = results.startTransitionProof.globalStateTreeRoot
//     //         const proof = formatProofForVerifierContract(results.startTransitionProof.proof)
    
//     //         let tx = await unirepContract.startUserStateTransition(
//     //             blindedUserState,
//     //             blindedHashChain,
//     //             GSTreeRoot,
//     //             proof
//     //         )
//     //         let receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

//     //         let proofNullifier = computeStartTransitionProofHash(
//     //             blindedUserState,
//     //             blindedHashChain,
//     //             GSTreeRoot,
//     //             proof
//     //         )
//     //         let proofIndex = await unirepContract.getProofIndex(proofNullifier)
//     //         proofIndexes.push(BigInt(proofIndex))

//     //         for (let i = 0; i < results.processAttestationProofs.length; i++) {
//     //             isValid = await verifyProof(Circuit.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
//     //             expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

//     //             const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
//     //             const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
//     //             const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

//     //             tx = await unirepContract.processAttestations(
//     //                 outputBlindedUserState,
//     //                 outputBlindedHashChain,
//     //                 inputBlindedUserState,
//     //                 formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//     //             )
//     //             receipt = await tx.wait()
//     //             expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)

//     //             const proofNullifier = computeProcessAttestationsProofHash(
//     //                 outputBlindedUserState,
//     //                 outputBlindedHashChain,
//     //                 inputBlindedUserState,
//     //                 formatProofForVerifierContract(results.processAttestationProofs[i].proof),
//     //             )
//     //             const proofIndex = await unirepContract.getProofIndex(proofNullifier)
//     //             proofIndexes.push(BigInt(proofIndex))
//     //         }

//     //         isValid = await verifyProof(Circuit.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
//     //         expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
//     //         const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf

//     //         const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
//     //         const blindedUserStates = results.finalTransitionProof.blindedUserStates
//     //         const blindedHashChains = results.finalTransitionProof.blindedHashChains

//     //         // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
//     //         const outputEPKNullifiers: BigInt[] = []
//     //         for (let i = 0; i < epkNullifiers.length; i++) {
//     //             const outputNullifier = results.finalTransitionProof.epochKeyNullifiers[i]
//     //             expect(BigNumber.from(epkNullifiers[i])).to.equal(BigNumber.from(outputNullifier))
//     //             outputEPKNullifiers.push(outputNullifier)
//     //         }
//     //         // Verify new state state outputted by circuit is the same as the one computed off-chain
//     //         users[firstUser].saveAttestations()
//     //         const newState = await users[firstUser].genNewUserStateAfterTransition()
//     //         expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf.toString())
//     //         userStateLeavesAfterTransition[firstUser] = newState.newUSTLeaves
//     //         userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)

//     //         const transitionProof = [
//     //             newGSTLeaf,
//     //             outputEpkNullifiers,
//     //             fromEpoch,
//     //             blindedUserStates,
//     //             GSTreeRoot,
//     //             blindedHashChains,
//     //             epochTreeRoot,
//     //             formatProofForVerifierContract(results.finalTransitionProof.proof),
//     //         ]
//     //         tx = await unirepContract.updateUserStateRoot(
//     //             transitionProof,
//     //             proofIndexes,
//     //         )
//     //         receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

//     //         // Record state transition proof inputs to be used to submit duplicated proof
//     //         duplicatedProofInputs = {
//     //             "newGSTLeaf": newGSTLeaf,
//     //             "epkNullifiers": outputEPKNullifiers,
//     //             "blindedUserStates": blindedUserStates,
//     //             "blindedHashChains": blindedHashChains,
//     //             "fromEpoch": fromEpoch,
//     //             "GSTreeRoot": GSTreeRoot,
//     //             "epochTreeRoot": epochTreeRoot,
//     //             "proof": formatProofForVerifierContract(results.finalTransitionProof.proof),
//     //             "proofIndexes": proofIndexes,
//     //         }
//     //     })

//     //     it('Verify state transition of first user\'s epoch transition', async () => {
//     //         const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
//     //         const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
//     //         expect(newLeafEvents.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

//     //         const proofIndex = newLeafEvents[0]?.args?._proofIndex
//     //         const isValidEvent = await verifyNewGSTProofByIndex(unirepContract, proofIndex)
//     //         expect(isValidEvent).not.equal(undefined)
//     //         expect(isValidEvent?.event).equal("UserStateTransitionProof")
//     //         const newLeaf = BigInt(newLeafEvents[0].args?._hashedLeaf)
//     //         validProofIndex[proofIndex.toNumber()] = true
            
//     //         const epkNullifiers = isValidEvent?.args?.userTransitionedData?.epkNullifiers
//     //         const _newGlobalStateTreeLeaf = isValidEvent?.args?.userTransitionedData?.newGlobalStateTreeLeaf
//     //         expect(newLeaf).equal(_newGlobalStateTreeLeaf)

//     //         const latestUserStateLeaves = userStateLeavesAfterTransition[firstUser]  // Leaves should be empty as no reputations are given yet
//     //         users[firstUser].transition(latestUserStateLeaves)
//     //         console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
//     //         expect(users[firstUser].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

//     //         unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(_newGlobalStateTreeLeaf), epkNullifiers)
//     //         console.log('User state transition off-chain: ')
//     //         console.log(`newGSTLeaf ${BigInt(_newGlobalStateTreeLeaf)} and epk nullifier ${epkNullifiers}`)
//     //         console.log('----------------------User State----------------------')
//     //         console.log(users[firstUser].toJSON(4))
//     //         console.log('------------------------------------------------------')
//     //     })

//     //     it('First user prove his reputation', async () => {
//     //         const attesterId = attesters[firstAttester].id  // Prove reputation received from first attester
//     //         const proveGraffiti = BigInt(1)
//     //         const minRep = BigInt(0)
//     //         const epkNonce = 0
//     //         const graffitiPreImage = graffitiPreImageMap[firstUser][attesterId.toString()]
//     //         console.log(`Proving reputation from attester ${attesterId} with minRep ${minRep} and graffitiPreimage ${graffitiPreImage}`)
//     //         const results = await users[firstUser].genProveReputationProof(attesterId, epkNonce, minRep, proveGraffiti, graffitiPreImage)
//     //         const isValid = await verifyProof(Circuit.proveReputation, results.proof, results.publicSignals)
//     //         expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

//     //         // Verify on-chain
//     //         const isProofValid = await unirepContract.verifyReputation(
//     //             results.reputationNullifiers,
//     //             results.epoch,
//     //             results.epochKey,
//     //             results.globalStatetreeRoot,
//     //             results.attesterId,
//     //             results.proveReputationAmount,
//     //             results.minRep,
//     //             results.proveGraffiti,
//     //             results.graffitiPreImage,
//     //             formatProofForVerifierContract(results.proof),
//     //         )
//     //         expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
//     //     })

//     //     it('First user submits duplicated state transition proof should fail', async () => {
//     //         await expect(unirepContract.updateUserStateRoot([
//     //             duplicatedProofInputs.newGSTLeaf,
//     //             duplicatedProofInputs.epkNullifiers,
//     //             duplicatedProofInputs.fromEpoch,
//     //             duplicatedProofInputs.blindedUserStates,
//     //             duplicatedProofInputs.GSTreeRoot,
//     //             duplicatedProofInputs.blindedHashChains,
//     //             duplicatedProofInputs.epochTreeRoot,
//     //             duplicatedProofInputs.proof,
//     //             ], duplicatedProofInputs.proofIndexes)
//     //         ).to.be.revertedWith('Unirep: the proof has been submitted before')
//     //     })

//     //     it('genUserStateFromContract should return equivalent UserState and UnirepState', async () => {
//     //         const userStateFromContract = await genUserStateFromContract(
//     //             hardhatEthers.provider,
//     //             unirepContract.address,
//     //             users[firstUser].id,
//     //         )

//     //         // Check user state matches
//     //         expect(users[firstUser].latestTransitionedEpoch, 'First user latest transitioned epoch mismatch').to.equal(userStateFromContract.latestTransitionedEpoch)
//     //         expect(users[firstUser].latestGSTLeafIndex, 'First user latest GST leaf index mismatch').to.equal(userStateFromContract.latestGSTLeafIndex)
//     //         expect((await users[firstUser].genUserStateTree()).getRootHash(), 'First user UST mismatch').to.equal((await userStateFromContract.genUserStateTree()).getRootHash())

//     //         // Check unirep state matches
//     //         expect(unirepState.currentEpoch, 'Unirep state current epoch mismatch').to.equal(userStateFromContract.getUnirepStateCurrentEpoch())
//     //         // Epoch tree is built after epoch transition
//     //         // there is no epochTree[3] in the 3rd epoch
//     //         for (let epoch = 1; epoch < unirepState.currentEpoch; epoch++) {
//     //             const GST = unirepState.genGSTree(epoch)
//     //             const _GST = userStateFromContract.getUnirepStateGSTree(epoch)
//     //             expect(GST.root, `Epoch ${epoch} GST root mismatch`).to.equal(_GST.root)

//     //             const epochTree = await unirepState.genEpochTree(epoch)
//     //             const _epochTree = await userStateFromContract.getUnirepStateEpochTree(epoch)
//     //             expect(epochTree.getRootHash(), `Epoch ${epoch} epoch tree root mismatch`).to.equal(_epochTree.getRootHash())
//     //         }
//     //     })

//     //     it('Submit random incorrect proof should not effect the unirepState', async () => {
//     //         const epkNullifiers: BigInt[] = []
//     //         const blindedHashChains: BigInt[] = []
//     //         const blindedUserStates: BigInt[] = []
//     //         const proof: BigInt[] = []
//     //         const reputationNullifiers: BigInt[] = []
//     //         const proofIndexes: BigInt[] = []
//     //         const proveReputationAmount = 0
//     //         const minRep = 0
//     //         const proveGraffiti = 1
//     //         const randonKey = genRandomSalt().toString()
//     //         const epochKey = BigInt(randonKey) % BigInt(2 ** epochTreeDepth)
//     //         for (let i = 0; i < maxReputationBudget; i++) {
//     //             reputationNullifiers.push(BigInt(255))
//     //         }
//     //         for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
//     //             epkNullifiers.push(BigInt(255))
//     //             blindedHashChains.push(BigInt(255))
//     //         }
//     //         for (let i = 0; i < 2; i++) {
//     //             blindedUserStates.push(BigInt(255))
//     //         }
//     //         for (let i = 0; i < 8; i++) {
//     //             proof.push(BigInt(0))
//     //         }
//     //         let tx = await unirepContract.startUserStateTransition(
//     //             genRandomSalt(),
//     //             genRandomSalt(),
//     //             genRandomSalt(),
//     //             proof,
//     //         )
//     //         let receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit random start transition proof failed').equal(1)
//     //         tx = await unirepContract.processAttestations(
//     //             genRandomSalt(),
//     //             genRandomSalt(),
//     //             genRandomSalt(),
//     //             proof,
//     //         )
//     //         receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit random process attestations proof failed').equal(1)
//     //         tx = await unirepContract.updateUserStateRoot([
//     //             genRandomSalt(),
//     //             epkNullifiers,
//     //             1,
//     //             blindedUserStates,
//     //             genRandomSalt(),
//     //             blindedHashChains,
//     //             genRandomSalt(),
//     //             proof,
//     //         ], proofIndexes )
//     //         receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit random user state transition proof failed').to.equal(1)
//     //         tx = await unirepContractCalledByFirstAttester.spendReputation([
//     //             reputationNullifiers,
//     //             currentEpoch,
//     //             epochKey,
//     //             genRandomSalt(),
//     //             1,
//     //             proveReputationAmount,
//     //             minRep,
//     //             proveGraffiti,
//     //             genRandomSalt(),
//     //             proof,
//     //             ],{value: attestingFee}
//     //         )
//     //         receipt = await tx.wait()
//     //         expect(receipt.status, 'Submit random reputation nullifiers proof failed').to.equal(1)
//     //     })

//     //     it('genUserStateFromContract should return equivalent UserState and UnirepState', async () => {
//     //         const userStateFromContract = await genUserStateFromContract(
//     //             hardhatEthers.provider,
//     //             unirepContract.address,
//     //             users[firstUser].id,
//     //         )

//     //         // Check user state matches
//     //         expect(users[firstUser].latestTransitionedEpoch, 'First user latest transitioned epoch mismatch').to.equal(userStateFromContract.latestTransitionedEpoch)
//     //         expect(users[firstUser].latestGSTLeafIndex, 'First user latest GST leaf index mismatch').to.equal(userStateFromContract.latestGSTLeafIndex)
//     //         expect((await users[firstUser].genUserStateTree()).getRootHash(), 'First user UST mismatch').to.equal((await userStateFromContract.genUserStateTree()).getRootHash())

//     //         // Check unirep state matches
//     //         expect(unirepState.currentEpoch, 'Unirep state current epoch mismatch').to.equal(userStateFromContract.getUnirepStateCurrentEpoch())
//     //         // Epoch tree is built after epoch transition
//     //         // there is no epochTree[3] in the 3rd epoch
//     //         for (let epoch = 1; epoch < unirepState.currentEpoch; epoch++) {
//     //             const GST = unirepState.genGSTree(epoch)
//     //             const _GST = userStateFromContract.getUnirepStateGSTree(epoch)
//     //             expect(GST.root, `Epoch ${epoch} GST root mismatch`).to.equal(_GST.root)

//     //             const epochTree = await unirepState.genEpochTree(epoch)
//     //             const _epochTree = await userStateFromContract.getUnirepStateEpochTree(epoch)
//     //             expect(epochTree.getRootHash(), `Epoch ${epoch} epoch tree root mismatch`).to.equal(_epochTree.getRootHash())
//     //         }
//     //     })
//     })
// })