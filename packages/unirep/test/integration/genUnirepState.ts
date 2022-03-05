// import { ethers as hardhatEthers } from 'hardhat'
// import { ethers } from 'ethers'
// import { expect } from 'chai'
// import { genRandomSalt, genIdentity, genIdentityCommitment, hashLeftRight, } from '@unirep/crypto'
// import { Circuit, formatProofForVerifierContract, genProofAndPublicSignals, verifyProof } from '@unirep/circuits'
// import { deployUnirep, EpochKeyProof, IEpochKeyProof } from '@unirep/contracts'
// import { Attestation, attestingFee, circuitGlobalStateTreeDepth, computeEmptyUserStateRoot, computeInitUserStateRoot, epochLength, genReputationNullifier, genUnirepStateFromContract, genUserStateFromContract, genUserStateFromParams, getTreeDepthsForTesting, maxAttesters, maxReputationBudget, maxUsers, numEpochKeyNoncePerEpoch,  Reputation,  UnirepContract,  UnirepState,  UserState } from '../../core'
// import { genEpochKeyCircuitInput, genNewGST, genNewUserStateTree, genProveSignUpCircuitInput, genRandomAttestation, genReputationCircuitInput, getReputationRecords } from '../utils'
// import { IncrementalQuinTree } from '@unirep/crypto'
// import { ReputationProof } from '@unirep/contracts'
// import { SignUpProof } from '@unirep/contracts'

// describe('Generate Unirep state', function () {
//     this.timeout(500000)

//     let users: UserState[] = new Array(2)
//     const firstUser = 0
//     const secondUser = 1
//     let userIds: any[] = []
//     let userCommitments: BigInt[] = []
//     let userStateTreeRoots: BigInt[] = []
//     let signUpAirdrops: Reputation[] = []

//     let unirepContract: ethers.Contract
//     let unirepContractCalledByAttester: ethers.Contract
//     let _treeDepths = getTreeDepthsForTesting("circuit")

//     let accounts: ethers.Signer[]
//     const attester = new Object()
//     let attesterId
//     const maxUsers = (2 ** circuitGlobalStateTreeDepth) - 1
//     const userNum = Math.ceil(Math.random() * maxUsers)

//     before(async () => {
//         accounts = await hardhatEthers.getSigners()

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

//     describe('Attester sign up and set airdrop', async () => {
//         it('attester sign up', async () => {
//             attester['acct'] = accounts[2]
//             attester['addr'] = await attester['acct'].getAddress()
//             unirepContractCalledByAttester = unirepContract.connect(attester['acct'])
//             let tx = await unirepContractCalledByAttester.attesterSignUp()
//             let receipt = await tx.wait()
//             expect(receipt.status, 'Attester signs up failed').to.equal(1)
//             attesterId = await unirepContract.attesters(attester['addr'])
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

//     describe('Init Unirep State', async () => {
//         it('check Unirep state matches the contract', async () => {
//             const initUnirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//             )

//             const contractEpoch = await unirepContract.currentEpoch()
//             const unirepEpoch = initUnirepState.currentEpoch
//             expect(unirepEpoch).equal(Number(contractEpoch))

//             const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch)
//             expect(unirepGSTLeaves).equal(0)

//             const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
//             const defaultGSTree = genNewGST(
//                 _treeDepths.globalStateTreeDepth, 
//                 _treeDepths.userStateTreeDepth
//             )
//             expect(unirepGSTree.root).equal(defaultGSTree.root)
//         })
//     })

//     describe('User Sign Up event', async () => {
//         const GSTree = genNewGST(
//             _treeDepths.globalStateTreeDepth, 
//             _treeDepths.userStateTreeDepth
//         )
//         const rootHistories: BigInt[] = []

//         it('sign up users through attester who sets airdrop', async () => {
//             for (let i = 0; i < userNum; i++) {
//                 const id = genIdentity()
//                 const commitment = genIdentityCommitment(id)
//                 userIds.push(id)
//                 userCommitments.push(commitment)

//                 const tx = await unirepContractCalledByAttester.userSignUp(commitment)
//                 const receipt = await tx.wait()
//                 expect(receipt.status, 'User sign up failed').to.equal(1)

//                 await expect(unirepContractCalledByAttester.userSignUp(commitment))
//                     .to.be.revertedWith('Unirep: the user has already signed up')
                

//                 const unirepState = await genUnirepStateFromContract(
//                     hardhatEthers.provider,
//                     unirepContract.address,
//                 )

//                 const contractEpoch = await unirepContract.currentEpoch()
//                 const unirepEpoch = unirepState.currentEpoch
//                 expect(unirepEpoch).equal(Number(contractEpoch))

//                 const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
//                 expect(unirepGSTLeaves).equal(i + 1)

//                 const attesterId = await unirepContract.attesters(attester['addr'])
//                 const airdroppedAmount = await unirepContract.airdropAmount(attester['addr'])
//                 const newUSTRoot = await computeInitUserStateRoot(
//                     _treeDepths.userStateTreeDepth,
//                     Number(attesterId),
//                     Number(airdroppedAmount)
//                 )
//                 const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
//                 userStateTreeRoots.push(newUSTRoot)
//                 signUpAirdrops.push(new Reputation(
//                     BigInt(airdroppedAmount),
//                     BigInt(0),
//                     BigInt(0),
//                     BigInt(1),
//                 ))
//                 GSTree.insert(newGSTLeaf)
//                 rootHistories.push(GSTree.root)
//             }
//         })

//         it('sign up users with no airdrop', async () => {
//             for (let i = 0; i < maxUsers - userNum; i++) {
//                 const id = genIdentity()
//                 const commitment = genIdentityCommitment(id)
//                 userIds.push(id)
//                 userCommitments.push(commitment)

//                 const tx = await unirepContract.userSignUp(commitment)
//                 const receipt = await tx.wait()
//                 expect(receipt.status, 'User sign up failed').to.equal(1)

//                 const unirepState = await genUnirepStateFromContract(
//                     hardhatEthers.provider,
//                     unirepContract.address,
//                 )

//                 const contractEpoch = await unirepContract.currentEpoch()
//                 const unirepEpoch = unirepState.currentEpoch
//                 expect(unirepEpoch).equal(Number(contractEpoch))

//                 const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
//                 expect(unirepGSTLeaves).equal(userNum + i + 1)

//                 const newUSTRoot = await computeInitUserStateRoot(
//                     _treeDepths.userStateTreeDepth,
//                 )
//                 const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
//                 userStateTreeRoots.push(newUSTRoot)
//                 signUpAirdrops.push(Reputation.default())
//                 GSTree.insert(newGSTLeaf)
//                 rootHistories.push(GSTree.root)
//             }
//         })

//         it('Sign up users more than contract capacity will not affect Unirep state', async () => {
//             const unirepStateBefore = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//             )
//             const unirepEpoch = unirepStateBefore.currentEpoch
//             const unirepGSTLeavesBefore = unirepStateBefore.getNumGSTLeaves(unirepEpoch)

//             const id = genIdentity()
//             const commitment = genIdentityCommitment(id)
//             await expect(unirepContract.userSignUp(commitment))
//                 .to.be.revertedWith('Unirep: maximum number of user signups reached')

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//             )
//             const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
//             expect(unirepGSTLeaves).equal(unirepGSTLeavesBefore)
//         })

//         it('Check GST roots match Unirep state',async () => {
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address,
//             )
//             for (let root of rootHistories) {
//                 const exist = unirepState.GSTRootExists(root, unirepState.currentEpoch)
//                 expect(exist).to.be.true
//             }
//         })
//     })

//     describe('Epoch key proof event', async () => {
//         let epochKey
//         let proofIndex
//         let epoch
//         const userIdx = 1
//         it('submit valid epoch key proof event', async () => {
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             epoch = Number(await unirepContract.currentEpoch())
//             const epkNonce = 0
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const circuitInputs = genEpochKeyCircuitInput(
//                 userIds[userIdx], 
//                 GSTree, 
//                 userIdx, 
//                 userStateTreeRoots[userIdx], 
//                 epoch, 
//                 epkNonce
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.verifyEpochKey, 
//                 circuitInputs
//             )
//             const epkProofInput = new EpochKeyProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await epkProofInput.verify()
//             expect(isValid).to.be.true

//             const tx = await unirepContract.submitEpochKeyProof(epkProofInput)
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = epkProofInput.epochKey
//             const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))

//             // submit the same proof twice should fail
//             await expect(unirepContract.submitEpochKeyProof(epkProofInput))
//                 .to.be.revertedWith('Unirep: the proof has been submitted before')
//         })

//         it('submit attestations to the epoch key should update Unirep state', async () => {            
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(1)
//             expect(attestations[0].toJSON()).equal(attestation.toJSON())
//         })

//         it('submit invalid epoch key proof event', async () => {
//             const userIdx = Math.floor(Math.random() * users.length)
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const epkNonce = 1
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const circuitInputs = genEpochKeyCircuitInput(
//                 userIds[userIdx], 
//                 GSTree, 
//                 userIdx, 
//                 userStateTreeRoots[userIdx], 
//                 epoch, 
//                 epkNonce
//             )
//             circuitInputs.GST_root = genRandomSalt().toString()
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.verifyEpochKey, 
//                 circuitInputs
//             )
//             const epkProofInput = new EpochKeyProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await epkProofInput.verify()
//             expect(isValid).to.be.false

//             const tx = await unirepContract.submitEpochKeyProof(epkProofInput)
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = epkProofInput.epochKey
//             const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))
//         })

//         it('submit attestations to the epoch key should not update Unirep state', async () => {            
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(0)
//         })

//         it('submit valid epoch key proof with wrong GST root event', async () => {
//             const ZERO_VALUE = 0
//             const GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
//             const id = genIdentity()
//             const commitment = genIdentityCommitment(id)
//             const stateRoot = genRandomSalt()
//             const leafIndex = 0

//             const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
//             GSTree.insert(BigInt(hashedStateLeaf.toString()))
//             const epkNonce = 0
//             const epoch = 1

//             const circuitInputs = genEpochKeyCircuitInput(
//                 id, 
//                 GSTree, 
//                 leafIndex, 
//                 stateRoot, 
//                 epoch, 
//                 epkNonce
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.verifyEpochKey, 
//                 circuitInputs
//             )
//             const epkProofInput = new EpochKeyProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await epkProofInput.verify()
//             expect(isValid).to.be.true

//             const tx = await unirepContract.submitEpochKeyProof(epkProofInput)
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = epkProofInput.epochKey
//             const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))
//         })

//         it('submit attestations to the epoch key should not update Unirep state', async () => {          
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(0)
//         })

//         it('submit valid epoch key proof event in wrong epoch', async () => {
//             const userIdx = Math.floor(Math.random() * users.length)
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const wrongEpoch = epoch + 1
//             const epkNonce = Math.floor(Math.random() * numEpochKeyNoncePerEpoch)
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const circuitInputs = genEpochKeyCircuitInput(
//                 userIds[userIdx], 
//                 GSTree, 
//                 userIdx, 
//                 userStateTreeRoots[userIdx], 
//                 wrongEpoch, 
//                 epkNonce
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.verifyEpochKey, 
//                 circuitInputs
//             )
//             const epkProofInput = new EpochKeyProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await epkProofInput.verify()
//             expect(isValid).to.be.true

//             await expect(unirepContract.submitEpochKeyProof(epkProofInput))
//                 .to.be.revertedWith('Unirep: submit an epoch key proof with incorrect epoch')
//         })
//     })

//     describe('Reputation proof event', async () => {
//         let epochKey
//         let proofIndex
//         let epoch
//         const userIdx = 2
//         let repNullifier
//         it('submit valid reputation proof event', async () => {
//             const epkNonce = 0
//             const spendReputation = Math.ceil(Math.random() * Number(signUpAirdrops[userIdx].posRep))
//             epoch = Number(await unirepContract.currentEpoch())
//             const reputationRecords = {}
//             reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
//             repNullifier = genReputationNullifier(userIds[userIdx].identityNullifier, epoch, 0, attesterId)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const circuitInputs = await genReputationCircuitInput(
//                 userIds[userIdx],
//                 epoch,
//                 epkNonce,
//                 GSTree,
//                 userIdx,
//                 reputationRecords,
//                 Number(attesterId),
//                 spendReputation,
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.proveReputation, 
//                 circuitInputs
//             )
//             const repProofInput = new ReputationProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await repProofInput.verify()
//             expect(isValid).to.be.true

//             const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: attestingFee })
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = repProofInput.epochKey
//             const hashedProof = await unirepContract.hashReputationProof(repProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))

//             await expect(unirepContractCalledByAttester.spendReputation(repProofInput, { value: attestingFee }))
//                 .to.be.revertedWith('Unirep: the proof has been submitted before')
//         })

//         it('spendReputation event should update Unirep state', async () => {
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(1)

//             // nullifiers should be added to unirepState
//             expect(unirepState.nullifierExist(repNullifier)).to.be.true
//         })

//         it('submit attestations to the epoch key should update Unirep state', async () => {            
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(2)
//             expect(attestations[1].toJSON()).equal(attestation.toJSON())
//         })

//         it('submit valid reputation proof event with same nullifiers', async () => {
//             const epkNonce = 1
//             const spendReputation = Math.ceil(Math.random() * Number(signUpAirdrops[userIdx].posRep))
//             epoch = Number(await unirepContract.currentEpoch())
//             const reputationRecords = {}
//             reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
//             repNullifier = genReputationNullifier(userIds[userIdx].identityNullifier, epoch, 0, attesterId)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const circuitInputs = await genReputationCircuitInput(
//                 userIds[userIdx],
//                 epoch,
//                 epkNonce,
//                 GSTree,
//                 userIdx,
//                 reputationRecords,
//                 Number(attesterId),
//                 spendReputation,
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.proveReputation, 
//                 circuitInputs
//             )
//             expect(publicSignals[0]).equal(repNullifier.toString())
//             const repProofInput = new ReputationProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await repProofInput.verify()
//             expect(isValid).to.be.true

//             const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: attestingFee })
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = repProofInput.epochKey
//             const hashedProof = await unirepContract.hashReputationProof(repProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))
//         })

//         it('duplicated nullifier should not update Unirep state', async () => {
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(0)
//         })

//         it('submit attestations to the epoch key should not update Unirep state', async () => {            
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(0)
//         })

//         it('submit invalid reputation proof event', async () => {
//             const epkNonce = 1
//             const spendReputation = Math.ceil(Math.random() * maxReputationBudget)
//             epoch = Number(await unirepContract.currentEpoch())
//             const reputationRecords = {}
//             reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const circuitInputs = await genReputationCircuitInput(
//                 userIds[userIdx],
//                 epoch,
//                 epkNonce,
//                 GSTree,
//                 userIdx,
//                 reputationRecords,
//                 Number(attesterId),
//                 spendReputation,
//             )
//             circuitInputs.GST_root = genRandomSalt().toString()
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.proveReputation, 
//                 circuitInputs
//             )
//             const repProofInput = new ReputationProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await repProofInput.verify()
//             expect(isValid).to.be.false

//             const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: attestingFee })
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = repProofInput.epochKey
//             const hashedProof = await unirepContract.hashReputationProof(repProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))
//         })

//         it('spendReputation event should not update Unirep state', async () => {
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             console.log(attestations)
//             expect(attestations.length).equal(0)
//         })

//         it('submit attestations to the epoch key should not update Unirep state', async () => {            
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(0)
//         })

//         it('submit valid reputation proof with wrong GST root event', async () => {
//             const epkNonce = 1
//             const ZERO_VALUE = 0
//             const reputationRecords = {}
//             reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
//             const userStateTree = await genNewUserStateTree()
//             for (const attester of Object.keys(reputationRecords)) {
//                 await userStateTree.update(BigInt(attester), reputationRecords[attester].hash())
//             }
//             const GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
//             const id = genIdentity()
//             const commitment = genIdentityCommitment(id)
//             const stateRoot = userStateTree.getRootHash()
//             const leafIndex = 0
//             const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
//             GSTree.insert(BigInt(hashedStateLeaf.toString()))
            
//             const circuitInputs = await genReputationCircuitInput(
//                 id, 
//                 epoch,
//                 epkNonce,
//                 GSTree,
//                 leafIndex,
//                 reputationRecords,
//                 BigInt(attesterId),
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.proveReputation, 
//                 circuitInputs
//             )
//             const repProofInput = new ReputationProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await repProofInput.verify()
//             expect(isValid).to.be.true

//             const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: attestingFee })
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = repProofInput.epochKey
//             const hashedProof = await unirepContract.hashReputationProof(repProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))
//         })

//         it('spendReputation event should not update Unirep state', async () => {
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(0)
//         })

//         it('submit attestations to the epoch key should not update Unirep state', async () => {            
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(0)
//         })

//         it('submit valid reputation proof event in wrong epoch should fail', async () => {
//             const epkNonce = 1
//             const spendReputation = Math.floor(Math.random() * maxReputationBudget)
//             const wrongEpoch = epoch + 1
//             const reputationRecords = {}
//             reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const circuitInputs = await genReputationCircuitInput(
//                 userIds[userIdx],
//                 wrongEpoch,
//                 epkNonce,
//                 GSTree,
//                 userIdx,
//                 reputationRecords,
//                 Number(attesterId),
//                 spendReputation,
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.proveReputation, 
//                 circuitInputs
//             )
//             const repProofInput = new ReputationProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await repProofInput.verify()
//             expect(isValid).to.be.true

//             await expect(unirepContractCalledByAttester.spendReputation(repProofInput, { value: attestingFee }))
//                 .to.be.revertedWith('Unirep: submit a reputation proof with incorrect epoch')
//         })
//     })

//     describe('Airdrop proof event', async () => {
//         let epochKey
//         let proofIndex
//         let epoch
//         const userIdx = 3
//         it('submit airdrop proof event', async () => {
//             epoch = Number(await unirepContract.currentEpoch())
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const GSTree = unirepState.genGSTree(unirepState.currentEpoch)
//             const reputationRecords = {}
//             reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx]

//             const circuitInputs = await genProveSignUpCircuitInput(
//                 userIds[userIdx], 
//                 epoch,
//                 GSTree,
//                 userIdx,
//                 reputationRecords,
//                 BigInt(attesterId),
//             )
//             const { proof, publicSignals } = await genProofAndPublicSignals(
//                 Circuit.proveUserSignUp, 
//                 circuitInputs
//             )
//             const airdropProofInput = new SignUpProof(
//                 publicSignals,
//                 proof
//             )
//             const isValid = await airdropProofInput.verify()
//             expect(isValid).to.be.true

//             const tx = await unirepContractCalledByAttester.airdropEpochKey(airdropProofInput)
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             epochKey = airdropProofInput.epochKey
//             const hashedProof = await unirepContract.hashSignUpProof(airdropProofInput)
//             proofIndex = Number(await unirepContract.getProofIndex(hashedProof))

//             await expect(unirepContractCalledByAttester.airdropEpochKey(airdropProofInput))
//                 .to.be.revertedWith('Unirep: the proof has been submitted before')
//         })

//         it('airdropEpochKey event should update Unirep state', async () => {
//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(1)
//         })

//         it('submit attestations to the epoch key should update Unirep state', async () => {            
//             const attestation = genRandomAttestation()
//             attestation.attesterId = BigInt(attesterId)
//             const tx = await unirepContractCalledByAttester.submitAttestation(
//                 attestation,
//                 epochKey,
//                 proofIndex
//             )
//             const receipt = await tx.wait()
//             expect(receipt.status).to.equal(1)

//             const unirepState = await genUnirepStateFromContract(
//                 hardhatEthers.provider,
//                 unirepContract.address
//             )
//             const attestations = unirepState.getAttestations(epochKey)
//             expect(attestations.length).equal(2)
//             expect(attestations[1].toJSON()).equal(attestation.toJSON())
//         })
//     })

// })