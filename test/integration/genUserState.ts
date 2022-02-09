// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, genIdentity, genIdentityCommitment, } from '@unirep/crypto'
import { Circuit, formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { computeProcessAttestationsProofHash, computeStartTransitionProofHash, deployUnirep, EpochKeyProof, ReputationProof, SignUpProof, UserTransitionProof } from '@unirep/contracts'
import { Attestation, attestingFee, epochLength, genUserStateFromContract, genUserStateFromParams, maxAttesters, maxReputationBudget, maxUsers, numEpochKeyNoncePerEpoch, UserState } from '../../core'
import { genRandomAttestation, getTreeDepthsForTesting } from '../utils'

describe('Generate user state', function () {
    this.timeout(500000)

    let users: UserState[] = new Array(2)
    const firstUser = 0
    const secondUser = 1
    let userIds: any[] = []
    let userCommitments: BigInt[] = []
    let savedUserState: any
    let secondUserState: any

    let unirepContract: ethers.Contract
    let unirepContractCalledByAttester: ethers.Contract
    let _treeDepths

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        _treeDepths = getTreeDepthsForTesting("circuit")
        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: maxAttesters,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            epochLength: epochLength,
            attestingFee: attestingFee
        }
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)
    })

    describe('Attester sign up and set airdrop', () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()
            unirepContractCalledByAttester = unirepContract.connect(attester['acct'])
            let tx = await unirepContractCalledByAttester.attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(attester['addr'])
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('User Sign Up event', () => {
        it('users sign up events', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            userIds.push(id)
            userCommitments.push(commitment)

            const initUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )

            const tx = await unirepContractCalledByAttester.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const currentEpoch = initUserState.getUnirepStateCurrentEpoch()
            const latestTransitionedToEpoch = currentEpoch
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp(currentEpoch)
            const userSignedUpEvents =  await unirepContract.queryFilter(UserSignedUpFilter)
            
            expect(userSignedUpEvents.length).equal(1)
            const args = userSignedUpEvents[0]?.args
            const _commitment = BigInt(args?._identityCommitment)
            expect(_commitment).equal(userCommitments[firstUser])
        
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(initUserState.toJSON())
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            expect(users[firstUser].latestTransitionedEpoch).equal(latestTransitionedToEpoch)
            console.log(`First user signs up with commitment (${commitment}), in epoch ${users[firstUser].latestTransitionedEpoch} and GST leaf ${users[firstUser].latestGSTLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('users sign up events', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            userIds.push(id)
            userCommitments.push(commitment)

            const tx = await unirepContractCalledByAttester.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)
            users[secondUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
            )
            console.log('----------- second user state ---------------')
            console.log(users[secondUser].toJSON(4))
            console.log('----------- end of second user state ---------------')
            secondUserState = users[secondUser].toJSON()
        })
    })

    describe('Attestation submitted event', () => {
        it('epoch key proof event', async () => {
            const userState = genUserStateFromParams(
                userIds[secondUser],
                JSON.parse(secondUserState),
            )
            const epochKeyNonce = 2
            const { proof, publicSignals } = await userState.genVerifyEpochKeyProof(epochKeyNonce)
            const epochKeyProof = new EpochKeyProof(
                publicSignals,
                proof
            )
            const isValid = await epochKeyProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            let tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const proofIndex = await unirepContract.getProofIndex(epochKeyProof.hash())
            expect(proofIndex.toNumber()).not.equal(0)
            const fromProofIndex = 0

            attesterId = BigInt(await unirepContract.attesters(attester['addr']))
            const attestation: Attestation = genRandomAttestation()
            attestation.attesterId = attesterId
            tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKeyProof.epochKey,
                proofIndex,
                fromProofIndex,
                { value: attestingFee }
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)
        })

        it('restored user state should match the user state after epoch key proof event', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('reputation proof event', async () => {
            const userState = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(savedUserState),
            )
            const epochKeyNonce = 1
            const minRep = 0
            const proveGraffiti = BigInt(0)
            const graffitiPreimage = BigInt(0)
            const nonceList = [BigInt(0), BigInt(1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1), BigInt(-1)]
            const { proof, publicSignals } = await userState.genProveReputationProof(attesterId, epochKeyNonce, minRep, proveGraffiti, graffitiPreimage, nonceList)
            const reputationProof = new ReputationProof(
                publicSignals,
                proof
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            const tx = await unirepContractCalledByAttester.spendReputation(reputationProof, {value: attestingFee})
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit reputation nullifiers failed').to.equal(1)

            const proofIndex = await unirepContract.getProofIndex(reputationProof.hash())
            expect(proofIndex.toNumber()).not.equal(0)
        })

        it('restored user state should match the user state after reputation proof event', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('airdrop proof event', async () => {
            const userState = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(savedUserState),
            )
            const  { proof, publicSignals } = await userState.genUserSignUpProof(attesterId)
            const userSignUpProof = new SignUpProof(
                publicSignals,
                proof
            )
            const isValid = await userSignUpProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            const tx = await unirepContractCalledByAttester.airdropEpochKey(userSignUpProof,{ value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit airdrop proof failed').to.equal(1)

            const proofIndex = await unirepContract.getProofIndex(userSignUpProof.hash())
            expect(proofIndex.toNumber()).not.equal(0)
        })

        it('restored user state should match the user state after airdrop proof event', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })
    })

    describe('Epoch transition event', () => {

        it('epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('restored user state should match the user state after epoch transition', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const epoch = 1
            const epochTreeRoot = await users[firstUser].getUnirepStateEpochTree(epoch)
            const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('user state transition', async () => {
            const proofIndexes: ethers.BigNumber[] = []
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await userState.genUserStateTransitionProofs()
            let isValid = await verifyProof(Circuit.startTransition, startTransitionProof.proof, startTransitionProof.publicSignals)
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = startTransitionProof.blindedUserState
            const blindedHashChain = startTransitionProof.blindedHashChain
            const globalStateTree = startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(startTransitionProof.proof)
            let tx = await unirepContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof,
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())

            let proofNullifier = computeStartTransitionProofHash(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(Circuit.processAttestations, processAttestationProofs[i].proof, processAttestationProofs[i].publicSignals)
                expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

                const outputBlindedUserState = processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain = processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState = processAttestationProofs[i].inputBlindedUserState

                // submit random process attestations should success and not affect the results
                const falseInput = genRandomSalt()
                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    falseInput,
                    formatProofForVerifierContract(processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)

                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
                console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof),
                )
                const proofIndex = await unirepContract.getProofIndex(proofNullifier)
                proofIndexes.push(proofIndex)
            }

            isValid = await verifyProof(Circuit.userStateTransition, finalTransitionProof.proof, finalTransitionProof.publicSignals)
            expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true

            const transitionProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )

            tx = await unirepContract.updateUserStateRoot(
                transitionProof, 
                proofIndexes,
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
        })

        it('restored user state should match the user state after user state transition', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const epoch = 1
            const epochTreeRoot = await users[firstUser].getUnirepStateEpochTree(epoch)
            const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('restored user state should match the user state after user state transition', async () => {
            let startTime = new Date().getTime()
            users[secondUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
                JSON.parse(secondUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const epoch = 1
            const epochTreeRoot = await users[secondUser].getUnirepStateEpochTree(epoch)
            const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
            expect(restoredUserState.toJSON()).equal(users[secondUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[secondUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
            expect(restoredUserStateFromParams.toJSON()).equal(users[secondUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[secondUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[secondUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[secondUser].toJSON(4)
        })

        it('user state transition', async () => {
            const proofIndexes: ethers.BigNumber[] = []
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
            )
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof
            } = await userState.genUserStateTransitionProofs()
            let isValid = await verifyProof(Circuit.startTransition, startTransitionProof.proof, startTransitionProof.publicSignals)
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = startTransitionProof.blindedUserState
            const blindedHashChain = startTransitionProof.blindedHashChain
            const globalStateTree = startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(startTransitionProof.proof)
            let tx = await unirepContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof,
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())

            let proofNullifier = computeStartTransitionProofHash(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(Circuit.processAttestations, processAttestationProofs[i].proof, processAttestationProofs[i].publicSignals)
                expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

                const outputBlindedUserState = processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain = processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState = processAttestationProofs[i].inputBlindedUserState

                // submit random process attestations should success and not affect the results
                const falseInput = genRandomSalt()
                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    falseInput,
                    formatProofForVerifierContract(processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)

                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
                console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof),
                )
                const proofIndex = await unirepContract.getProofIndex(proofNullifier)
                proofIndexes.push(proofIndex)
            }

            isValid = await verifyProof(Circuit.userStateTransition, finalTransitionProof.proof, finalTransitionProof.publicSignals)
            expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true

            const transitionProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )

            tx = await unirepContract.updateUserStateRoot(
                transitionProof, 
                proofIndexes,
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
        })

        it('restored user state should match the user state after user state transition', async () => {
            let startTime = new Date().getTime()
            users[secondUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
                JSON.parse(secondUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const epoch = 1
            const epochTreeRoot = await users[secondUser].getUnirepStateEpochTree(epoch)
            const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[secondUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[secondUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[secondUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[secondUser].toJSON(4)
        })
    })
})