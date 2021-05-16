import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, circuitNullifierTreeDepth, numAttestationsPerEpochKey, circuitUserStateTreeDepth} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { genRandomSalt, IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { deployUnirep, genEpochKey, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { DEFAULT_AIRDROPPED_KARMA, MAX_KARMA_BUDGET } from '../../config/socialMedia'
import { Attestation, UnirepState, UserState } from '../../core'
import {  formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, getSignalByNameViaSym, verifyProveReputationProof } from '../circuits/utils'
import { DEFAULT_ETH_PROVIDER } from '../../cli/defaults'


describe('Vote', function () {
    this.timeout(300000)

    let circuit
    let unirepContract
    let GSTree
    let emptyUserStateRoot
    let userNum = 4
    const ids = new Array(userNum)
    const commitments = new Array(userNum)
    let users: UserState[] = new Array(userNum)
    let unirepState
    let attesters = new Array(userNum)
    let attesterAddresses = new Array(userNum)
    
    let accounts: ethers.Signer[]
    let provider
    let unirepContractCalledByAttesters = new Array(userNum)

    let proof
    let publicSignals
    let witness
    const epochKeyNonce = 0
    const epochKeyNonce2 = 1
    let fromEpk
    let toEpk
    let attesterId 
    let upvoteValue = 3
    let downvoteValue = 5
    const graffiti = genRandomSalt()
    const overwriteGraffiti = true
    let attestation
    
    before(async () => {
        accounts = await hardhatEthers.getSigners()
        provider = new hardhatEthers.providers.JsonRpcProvider(DEFAULT_ETH_PROVIDER)

        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
    })

    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee()
        expect(attestingFee).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(epochLength).equal(epochLength_)
        const numAttestationsPerEpochKey_ = await unirepContract.numAttestationsPerEpochKey()
        expect(numAttestationsPerEpochKey).equal(numAttestationsPerEpochKey_)
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const numAttestationsPerEpoch_ = await unirepContract.numAttestationsPerEpoch()
        expect(numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey).equal(numAttestationsPerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(circuitEpochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(circuitGlobalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(circuitNullifierTreeDepth).equal(treeDepths_.nullifierTreeDepth)
        expect(circuitUserStateTreeDepth).equal(treeDepths_.userStateTreeDepth)
    })

    it('should have the correct default value', async () => {
        const emptyUSTree = await genNewUserStateTree()
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        expect(BigNumber.from(emptyUSTree.getRootHash())).equal(emptyUserStateRoot)

        const emptyGlobalStateTreeRoot = await unirepContract.emptyGlobalStateTreeRoot()
        expect(BigNumber.from(GSTree.root)).equal(emptyGlobalStateTreeRoot)
    })

    describe('User sign-ups', () => {

        it('sign up should succeed', async () => {
            let GSTreeLeafIndex: number = -1
            const currentEpoch = await unirepContract.currentEpoch()
            unirepState = new UnirepState(
                circuitGlobalStateTreeDepth,
                circuitUserStateTreeDepth,
                circuitEpochTreeDepth,
                circuitNullifierTreeDepth,
                attestingFee,
                epochLength,
                numEpochKeyNoncePerEpoch,
                numAttestationsPerEpochKey,
            )
            for (let i = 0; i < userNum; i++) {
                ids[i] = genIdentity()
                commitments[i] = genIdentityCommitment(ids[i])
                const tx = await unirepContract.userSignUp(commitments[i])
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(i+1).equal(numUserSignUps_)

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitments[i],
                        emptyUserStateRoot,
                        BigInt(DEFAULT_AIRDROPPED_KARMA),
                        BigInt(0)
                    ]
                )
                GSTree.insert(hashedStateLeaf)

                unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
                users[i] = new UserState(
                    unirepState,
                    ids[i],
                    commitments[i],
                    false
                )

                const latestTransitionedToEpoch = currentEpoch.toNumber()
                const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
                const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
                

                for (let i = 0; i < newLeafEvents.length; i++) {
                    if(BigInt(newLeafEvents[i]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                        GSTreeLeafIndex = newLeafEvents[i]?.args?._leafIndex.toNumber()
                    }
                }
                expect(GSTreeLeafIndex).to.equal(i)
            
                users[i].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            }
        })

        it('sign up should succeed', async () => {
            for (let i = 0; i < userNum; i++) {
                attesters[i] = accounts[i+1]
                attesterAddresses[i] = await attesters[i].getAddress()
                unirepContractCalledByAttesters[i] = await hardhatEthers.getContractAt(Unirep.abi, unirepContract.address, attesters[i])
                const tx = await unirepContractCalledByAttesters[i].attesterSignUp()
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)

                const attesterId = await unirepContract.attesters(attesterAddresses[i])
                expect(i+1).equal(attesterId)
                const nextAttesterId_ = await unirepContract.nextAttesterId()
                // nextAttesterId starts with 1 so now it should be 2
                expect(i+2).equal(nextAttesterId_)
            }
        })
    })

    describe('Generate reputation proof for verification', () => {

        it('reputation proof should be verified valid off-chain', async() => {
            const nonceStarter = 0
            const circuitInputs = await users[0].genProveReputationCircuitInputs(
                epochKeyNonce,
                upvoteValue,
                nonceStarter,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            witness = results['witness']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is not valid").to.be.true
        })

        it('reputation proof should be verified valid on-chain', async() => {
            const isProofValid = await unirepContract.verifyReputation(
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true
        })
    })

    // user 1 and user 2
    describe('Upvote', () => {
        let currentEpoch
        attesterId = 1
        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(upvoteValue),
            BigInt(0),
            graffiti,
            overwriteGraffiti,
        )
        const fromUser = 0
        const toUser = 1

        it('submit upvote should succeed', async() => {
            currentEpoch = (await unirepContract.currentEpoch()).toNumber()

            fromEpk = genEpochKey(ids[fromUser].identityNullifier, currentEpoch, epochKeyNonce)

            toEpk = genEpochKey(ids[toUser].identityNullifier, currentEpoch, epochKeyNonce)

            const nullifiers: BigInt[] = [] 

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', witness, variableName))
            }

            const tx = await unirepContractCalledByAttesters[fromUser].vote(
                attestation, 
                toEpk,
                fromEpk, 
                publicSignals, 
                formatProofForVerifierContract(proof),
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)
        })

        it('submit upvote with duplicated nullifiers should fail', async() => {
            
            fromEpk = genEpochKey(ids[fromUser].identityNullifier, currentEpoch, epochKeyNonce, circuitEpochTreeDepth)

            toEpk = genEpochKey(ids[toUser].identityNullifier, currentEpoch, epochKeyNonce2, circuitEpochTreeDepth)

            const nonceStarter = 1
            const circuitInputs = await users[fromUser].genProveReputationCircuitInputs(
                epochKeyNonce,
                upvoteValue,
                nonceStarter,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            witness = results['witness']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is not valid").to.be.true

            const isProofValid = await unirepContract.verifyReputation(
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true

            const nullifiers: BigInt[] = [] 
            
            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', witness, variableName))
            }

            await expect(unirepContractCalledByAttesters[fromUser].vote(
                attestation, 
                toEpk,
                fromEpk, 
                publicSignals, 
                formatProofForVerifierContract(proof),
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the nullifier has been submitted')
        })

        it('submit upvote from the same epoch key should fail', async() => {
            
            fromEpk = genEpochKey(ids[fromUser].identityNullifier, currentEpoch, epochKeyNonce, circuitEpochTreeDepth)

            toEpk = genEpochKey(ids[toUser].identityNullifier, currentEpoch, epochKeyNonce2, circuitEpochTreeDepth)

            const nonceStarter = 10
            const circuitInputs = await users[fromUser].genProveReputationCircuitInputs(
                epochKeyNonce,
                upvoteValue,
                nonceStarter,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            witness = results['witness']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is not valid").to.be.true

            const isProofValid = await unirepContract.verifyReputation(
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true

            const nullifiers: BigInt[] = [] 
            
            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', witness, variableName))
            }

            await expect(unirepContractCalledByAttesters[fromUser].vote(
                attestation, 
                toEpk,
                fromEpk, 
                publicSignals, 
                formatProofForVerifierContract(proof),
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: attester has already attested to this epoch key')
        })

        it('submit upvote with invalid proof should fail', async() => {

            fromEpk = genEpochKey(ids[fromUser].identityNullifier, currentEpoch, epochKeyNonce2, circuitEpochTreeDepth)

            toEpk = genEpochKey(ids[toUser].identityNullifier, currentEpoch, epochKeyNonce2, circuitEpochTreeDepth)
            
            const nonceStarter = 20
            const circuitInputs = await users[fromUser].genProveReputationCircuitInputs(
                epochKeyNonce2,
                upvoteValue,
                nonceStarter,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            witness = results['witness']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is valid").to.be.false

            const isProofValid = await unirepContract.verifyReputation(
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is valid").to.be.false

            const nullifiers: BigInt[] = [] 
            
            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', witness, variableName))
            }

            await expect(unirepContractCalledByAttesters[fromUser].vote(
                attestation, 
                toEpk,
                fromEpk, 
                publicSignals, 
                formatProofForVerifierContract(proof),
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the proof is not valid')
        })

        it('submit vote with 0 value should fail', async() => {

            const zeroAttestation = new Attestation(
                BigInt(attesterId),
                BigInt(0),
                BigInt(0),
                graffiti,
                overwriteGraffiti,
            )

            const nullifiers: BigInt[] = [] 
            
            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', witness, variableName))
            }

            await expect(unirepContractCalledByAttesters[fromUser].vote(
                zeroAttestation, 
                toEpk,
                fromEpk, 
                publicSignals, 
                formatProofForVerifierContract(proof),
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: should submit a positive vote value')
        })

        it('submit vote with both upvote value and downvote value should fail', async() => {

            const invalidAttestation = new Attestation(
                BigInt(attesterId),
                BigInt(upvoteValue),
                BigInt(downvoteValue),
                graffiti,
                overwriteGraffiti,
            )

            const nullifiers: BigInt[] = [] 
            
            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', witness, variableName))
            }

            await expect(unirepContractCalledByAttesters[fromUser].vote(
                invalidAttestation, 
                toEpk,
                fromEpk, 
                publicSignals, 
                formatProofForVerifierContract(proof),
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: should only choose to upvote or to downvote')
        })
    })
})