import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, maxEpochKeyNonce, numAttestationsPerEpochKey} from '../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, genRandomSalt, stringifyBigInts, hashLeftRight, hashOne } from 'maci-crypto'
import { deployUnirep, genEpochKey, toCompleteHexString, computeEmptyUserStateRoot, getTreeDepthsForTesting } from './utils'

const { expect } = chai

import { Attestation, IAttestation, IEpochTreeLeaf, IUserStateLeaf, UnirepState, UserState, genUserStateFromContract } from "../core"
import { compileAndLoadCircuit, formatProofForVerifierContract, genVerifyEpochKeyProofAndPublicSignals, genVerifyReputationProofAndPublicSignals, genVerifyUserStateTransitionProofAndPublicSignals, getSignalByName, verifyEPKProof, verifyProveReputationProof, verifyUserStateTransitionProof } from "./circuits/utils"

describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    let attesters = new Array(2)

    // Data that are needed for verifying proof
    let userStateLeavesAfterTransition: IUserStateLeaf[][] = new Array(2)
    let graffitiPreImageMap = new Array(2)

    let unirepContract: ethers.Contract
    let unirepContractCalledByFirstAttester, unirepContractCalledBySecondAttester

    let prevEpoch: ethers.BigNumber
    let currentEpoch: ethers.BigNumber
    let emptyUserStateRoot: BigInt
    let blankGSLeaf: BigInt

    let accounts: ethers.Signer[]

    let verifyEpochKeyCircuit, verifyUserStateTransitionCircuit, verifyReputationCircuit
    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        verifyEpochKeyCircuit = await compileAndLoadCircuit('test/verifyEpochKey_test.circom')
        verifyUserStateTransitionCircuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
        verifyReputationCircuit = await compileAndLoadCircuit('test/proveReputation_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Total compile time for three circuits: ${endCompileTime - startCompileTime} seconds`)

        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("circuit")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)

        currentEpoch = await unirepContract.currentEpoch()
        emptyUserStateRoot = computeEmptyUserStateRoot(circuitUserStateTreeDepth)
        blankGSLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)

        unirepState = new UnirepState(
            circuitGlobalStateTreeDepth,
            circuitUserStateTreeDepth,
            circuitEpochTreeDepth,
            circuitNullifierTreeDepth,
            attestingFee,
            epochLength,
            maxEpochKeyNonce,
            numAttestationsPerEpochKey,
        )
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
            users[0] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const GSTreeLeafIndex = 0
            users[0].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            console.log(`First user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First attester signs up', async () => {
            attesters[0] = new Object()
            attesters[0]['acct'] = accounts[1]
            attesters[0]['addr'] = await attesters[0]['acct'].getAddress()
            unirepContractCalledByFirstAttester = unirepContract.connect(attesters[0]['acct'])

            const tx = await unirepContractCalledByFirstAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester sign up failed').to.equal(1)
            
            attesters[0].id = BigInt(await unirepContract.attesters(attesters[0]['addr']))
            console.log(`First attester signs up, attester id: ${attesters[0].id}`)
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                observedGST.insert(leaf)
            }
            expect(observedGST.root, 'GST root mismatch').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
        const secondEpochEpochKeys: string[] = []
        it('begin first epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 2').to.equal(2)

            unirepState.epochTransition(prevEpoch.toNumber(), [])
            console.log('----------------------Unirep State----------------------')
            console.log(unirepState.toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user transition from first epoch: process first epoch key', async () => {
            const epochKeyNonce = 0
            const fromEpoch = users[0].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const oldNullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const nullifiers = users[0].getNullifiers(fromEpoch, epochKeyNonce)
            console.log('Processing first user\'s first epk: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${oldNullifierTreeRoot}`)
            console.log(`and nullifiers [${nullifiers}]`)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs(epochKeyNonce)
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByName(results['circuit'], results['witness'], 'main.new_GST_leaf')
            expect(BigNumber.from(newGSTLeaf), 'New GST leaf should be zero as there are epoch keys left to process').to.equal(0)

            const newState = await users[0].genNewUserStateAfterProcessEPK(epochKeyNonce)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            const epkNullifier = users[0].getEpochKeyNullifier(fromEpoch, epochKeyNonce)
            let tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                nullifiers,
                epkNullifier,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        })

        it('Verify state transition of first user\'s first epoch key', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, 'Number of state transition events current epoch should be 1').to.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length, 'Number of new GST leaves should be 1').to.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            // Verify on-chain
            // First try verify with incorrect new GST leaf
            // (to insert new GST leaf while not supposed to because there are epoch keys left to process)
            const invalidNewGSTLeaf = genRandomSalt()
            let isProofValid = await unirepContract.verifyUserStateTransition(
                invalidNewGSTLeaf,
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_epkNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid, 'Verify invalid user state transition on-chain should fail').to.be.false
            // Next verify with correct user transition data
            isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_epkNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            const epkNullifier = BigInt(stateTransitionArgs['_epkNullifier'])
            allNullifiers.push(epkNullifier)

            const epochKeyNonce = 0
            const latestUserStateLeaves = userStateLeavesAfterTransition[0]  // Leaves should be empty as no reputations are given yet
            users[0].epochKeyProcessed(
                epochKeyNonce,
                latestUserStateLeaves,
            )

            // NOTE: unirep.userStateTransition should be called after user.epochKeyProcessed because
            // user._transition depends on unirep state's current number of GST leaves.
            // If unirep state update it's GST leaves before user state does, user state
            // would get wrong GST leaf index.
            console.log(`First user finish processing first epoch key. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(newGSTLeafArgs['_hashedLeaf'])}, attestation nullifiers [${nullifiers}] and epk nullifier ${epkNullifier}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user transition from first epoch: process second epoch key', async () => {
            const epochKeyNonce = 1
            const fromEpoch = users[0].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const oldNullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const nullifiers = users[0].getNullifiers(fromEpoch, epochKeyNonce)
            console.log('Processing first user\'s second epk: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${oldNullifierTreeRoot}`)
            console.log(`and nullifiers [${nullifiers}]`)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs(epochKeyNonce)
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByName(results['circuit'], results['witness'], 'main.new_GST_leaf')
            
            const newState = await users[0].genNewUserStateAfterProcessEPK(epochKeyNonce)
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            const epkNullifier = users[0].getEpochKeyNullifier(fromEpoch, epochKeyNonce)
            let tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                nullifiers,
                epkNullifier,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        })

        it('Verify state transition of first user\'s second epoch key', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, 'Number of state transition events current epoch should be 2').to.equal(2)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length, 'Number of new GST leaves should be 2').to.equal(2)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[1]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[1]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_epkNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            const epkNullifier = BigInt(stateTransitionArgs['_epkNullifier'])
            allNullifiers.push(epkNullifier)

            const epochKeyNonce = 1
            const latestUserStateLeaves = userStateLeavesAfterTransition[0]  // Leaves should be empty as no reputations are given yet
            users[0].epochKeyProcessed(
                epochKeyNonce,
                latestUserStateLeaves,
            )
            console.log(`First user finish processing second epoch key. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[0].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(newGSTLeafArgs['_hashedLeaf'])}, attestation nullifiers [${nullifiers}] and epk nullifier ${epkNullifier}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
            users[1] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const GSTreeLeafIndex = 1
            users[1].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            console.log(`Second user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[1].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('Second attester signs up', async () => {
            attesters[1] = new Object()
            attesters[1]['acct'] = accounts[2]
            attesters[1]['addr'] = await attesters[1]['acct'].getAddress()
            unirepContractCalledBySecondAttester = unirepContract.connect(attesters[1]['acct'])
            
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester sign up failed').to.equal(1)

            attesters[1].id = BigInt(await unirepContract.attesters(attesters[1]['addr']))
            console.log(`First attester signs up, attester id: ${attesters[0].id}`)
        })

        it('Verify epoch key of first user', async () => {
            const epochKeyNonce = 0
            const circuitInputs = await users[0].genVerifyEpochKeyCircuitInputs(epochKeyNonce)
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyEpochKeyCircuit)
            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                firstUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            console.log(`Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
        })

        it('First attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[0].id,
                BigInt(3),
                BigInt(1),
                hashOne(graffitiPreImage),
                true,
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[0] = new Object()
            graffitiPreImageMap[0][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledByFirstAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            secondEpochEpochKeys.push(firstUserEpochKey.toString())
            unirepState.addAttestation(firstUserEpochKey.toString(), attestation)
        })

        it('Verify epoch key of second user', async () => {
            const epochKeyNonce = 0
            const circuitInputs = await users[1].genVerifyEpochKeyCircuitInputs(epochKeyNonce)
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyEpochKeyCircuit)
            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                secondUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            console.log(`Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${secondUserEpochKey}`)
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
        })

        it('First attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[0].id,
                BigInt(2),
                BigInt(6),
                hashOne(graffitiPreImage),
                true,
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[1] = new Object()
            graffitiPreImageMap[1][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${secondUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledByFirstAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)
        })

        it('Second attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[1].id,
                BigInt(0),
                BigInt(3),
                hashOne(graffitiPreImage),
                true,
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[0][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${secondUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledBySecondAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)
        })

        it('Attestations gathered from events should match', async () => {
            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            expect(attestationsByEpochEvent.length, 'Number of attestations submitted should be 3').to.equal(3)

            // Second filter by attester
            for (let attester of attesters) {
                let attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, attester['addr'])
                let attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
                if (attester.id == 1) {
                    expect(attestationsByAttesterEvent.length, 'Number of attestations from first attester should be 2').to.equal(2)
                } else if (attester.id == 2) {
                    expect(attestationsByAttesterEvent.length, 'Number of attestations from second attester should be 1').to.equal(1)
                } else {
                    throw new Error(`Invalid attester id ${attester.id}`)
                }
            }

            // Last filter by epoch key
            for (let epochKey of secondEpochEpochKeys) {
                const epkInHexStr = toCompleteHexString(BigInt(epochKey).toString(16), 32)
                let attestationsByEpochKeyFilter = unirepContract.filters.AttestationSubmitted(null, epkInHexStr)
                let attestationsByEpochKeyEvent = await unirepContract.queryFilter(attestationsByEpochKeyFilter)
                let attestations_: IAttestation[] = attestationsByEpochKeyEvent.map((event: any) => event['args']['attestation'])

                let attestations: IAttestation[] = unirepState.getAttestations(epochKey)
                expect(attestationsByEpochKeyEvent.length, `Number of attestations to epk ${epochKey} should be ${attestations.length}`).to.equal(attestations.length)

                for (let i = 0; i < attestations_.length; i++) {
                    console.log(`Comparing attestation ${i} attesting to epk ${epochKey}`)
                    expect(attestations[i]['attesterId'], 'Mismatched attesterId').to.equal(attestations_[i]['attesterId'])
                    expect(attestations[i]['posRep'], 'Mismatched posRep').to.equal(attestations_[i]['posRep'])
                    expect(attestations[i]['negRep'], 'Mismatched negRep').to.equal(attestations_[i]['negRep'])
                    expect(attestations[i]['graffiti'], 'Mismatched graffiti').to.equal(attestations_[i]['graffiti'])
                    expect(attestations[i]['overwriteGraffiti'], 'Mismatched overwriteGraffiti').to.equal(attestations_[i]['overwriteGraffiti'])
                }
            }
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                // Only insert non-zero leaf
                if (leaf.gt(0)) observedGST.insert(leaf)
            }
            expect(observedGST.root, 'GSTreeRoot mismatched').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    describe('Third epoch', () => {
        it('begin second epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 3').to.equal(3)

            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(prevEpoch)
            expect(epochKeys_.length, 'Number of epoch keys last epoch should be 2').to.equal(2)

            epochKeys_ = epochKeys_.map((epk) => epk.toString())
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => hc.toString())
            // Add epoch tree leaves to unirepState
            const epochTreeLeaves: IEpochTreeLeaf[] = []
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(epochKeys_[i]),
                    hashchainResult: BigInt(epochKeyHashchains_[i])
                }
                epochTreeLeaves.push(epochTreeLeaf)
            }

            unirepState.epochTransition(prevEpoch.toNumber(), epochTreeLeaves)
            console.log(`Updating epoch tree leaves off-chain with list of epoch keys: [${epochTreeLeaves.map((l) => l.epochKey.toString())}]`)
            console.log('----------------------Unirep State----------------------')
            console.log(unirepState.toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user transition from second epoch: process second epoch key', async () => {
            const epochKeyNonce = 1
            const fromEpoch = users[0].latestTransitionedEpoch
            const fromEpochGSTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const oldNullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const nullifiers = users[0].getNullifiers(fromEpoch, epochKeyNonce)
            console.log('Processing first user\'s second epk: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${oldNullifierTreeRoot}`)
            console.log(`and nullifiers [${nullifiers}]`)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs(epochKeyNonce)
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByName(results['circuit'], results['witness'], 'main.new_GST_leaf')
            expect(BigNumber.from(newGSTLeaf), 'New GST leaf should be zero as there are epoch keys left to process').to.equal(0)


            const newState = await users[0].genNewUserStateAfterProcessEPK(epochKeyNonce)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            const epkNullifier = users[0].getEpochKeyNullifier(fromEpoch, epochKeyNonce)
            let tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                nullifiers,
                epkNullifier,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        })

        it('Verify state transition of first user\'s second epoch key', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, 'Number of state transition events current epoch should be 1').to.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length, 'Number of new GST leaves should be 1').to.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_epkNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            const epkNullifier = BigInt(stateTransitionArgs['_epkNullifier'])
            allNullifiers.push(epkNullifier)

            const epochKeyNonce = 1
            const latestUserStateLeaves = userStateLeavesAfterTransition[0]
            users[0].epochKeyProcessed(
                epochKeyNonce,
                latestUserStateLeaves,
            )
            console.log(`First user finish processing second epoch key. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(newGSTLeafArgs['_hashedLeaf'])}, attestation nullifiers [${nullifiers}] and epk nullifier ${epkNullifier}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user try to prove his reputation before processing all epoch keys', async () => {
            const attesterId = attesters[0].id  // Prove reputation received from first attester
            const minPosRep = BigInt(0)
            const maxNegRep = BigInt(10)
            const graffitiPreImage = graffitiPreImageMap[0][attesterId.toString()]
            let error
            try {
                const circuitInputs = await users[0].genProveReputationCircuitInputs(attesterId, minPosRep, maxNegRep, graffitiPreImage)
                const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyReputationCircuit)
            } catch (e) {
                error = e
                expect(true).to.be.true
            } finally {
                if (!error) throw Error("Proving reputation before processing all epoch keys should throw error")
            }
        })

        it('First user transition from second epoch: process first epoch key', async () => {
            const epochKeyNonce = 0
            const fromEpoch = users[0].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const oldNullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const nullifiers = users[0].getNullifiers(fromEpoch, epochKeyNonce)
            console.log('Processing first user\'s first epk: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${oldNullifierTreeRoot}`)
            console.log(`and nullifiers [${nullifiers}]`)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs(epochKeyNonce)
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByName(results['circuit'], results['witness'], 'main.new_GST_leaf')

            const newState = await users[0].genNewUserStateAfterProcessEPK(epochKeyNonce)
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            const epkNullifier = users[0].getEpochKeyNullifier(fromEpoch, epochKeyNonce)
            let tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                nullifiers,
                epkNullifier,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        })

        it('Verify state transition of first user\'s first epoch key', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, 'Number of state transition events current epoch should be 2').to.equal(2)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length, 'Number of new GST leaves should be 2').to.equal(2)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[1]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[1]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_epkNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            const epkNullifier = BigInt(stateTransitionArgs['_epkNullifier'])
            allNullifiers.push(epkNullifier)

            const epochKeyNonce = 0
            const latestUserStateLeaves = userStateLeavesAfterTransition[0]  // Leaves should be empty as no reputations are given yet
            users[0].epochKeyProcessed(
                epochKeyNonce,
                latestUserStateLeaves,
            )
            expect(users[0].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            console.log(`First user finish processing first epoch key. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(newGSTLeafArgs['_hashedLeaf'])}, attestation nullifiers [${nullifiers}] and epk nullifier ${epkNullifier}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user prove his reputation', async () => {
            const attesterId = attesters[0].id  // Prove reputation received from first attester
            const minPosRep = BigInt(1)
            const maxNegRep = BigInt(10)
            const graffitiPreImage = graffitiPreImageMap[0][attesterId.toString()]
            console.log(`Proving reputation from attester ${attesterId} with minPosRep ${minPosRep}, maxNegRep ${maxNegRep} and graffitiPreimage ${graffitiPreImage}`)
            const circuitInputs = await users[0].genProveReputationCircuitInputs(attesterId, minPosRep, maxNegRep, graffitiPreImage)
            const startTime = Math.floor(new Date().getTime() / 1000)
            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyReputationCircuit)
            const endTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            // Verify on-chain
            const GSTreeRoot = unirepState.genGSTree(currentEpoch.toNumber()).root
            const isProofValid = await unirepContract.verifyReputation(
                GSTreeRoot,
                attesterId,
                minPosRep,
                maxNegRep,
                graffitiPreImage,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
        })

        it('genUserStateFromContract should return equivalent UserState and UnirepState', async () => {
            const userStateFromContract = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                0,
                users[0].id,
                users[0].commitment,
            )

            // Check user state matches
            expect(users[0].latestTransitionedEpoch, 'First user latest transitioned epoch mismatch').to.equal(userStateFromContract.latestTransitionedEpoch)
            expect(users[0].latestGSTLeafIndex, 'First user latest GST leaf index mismatch').to.equal(userStateFromContract.latestGSTLeafIndex)
            expect((await users[0].genUserStateTree()).getRootHash(), 'First user UST mismatch').to.equal((await userStateFromContract.genUserStateTree()).getRootHash())

            // Check unirep state matches
            expect(unirepState.currentEpoch, 'Unirep state current epoch mismatch').to.equal(userStateFromContract.getUnirepStateCurrentEpoch())
            for (let epoch = 1; epoch <= unirepState.currentEpoch; epoch++) {
                const GST = unirepState.genGSTree(epoch)
                const _GST = userStateFromContract.getUnirepStateGSTree(epoch)
                expect(GST.root, `Epoch ${epoch} GST root mismatch`).to.equal(_GST.root)

                const epochTree = await unirepState.genEpochTree(epoch)
                const _epochTree = await userStateFromContract.getUnirepStateEpochTree(epoch)
                expect(epochTree.getRootHash(), `Epoch ${epoch} epoch tree root mismatch`).to.equal(_epochTree.getRootHash())

                const nullifierTree = await unirepState.genNullifierTree()
                const _nullifierTree = await userStateFromContract.getUnirepStateNullifierTree()
                expect(nullifierTree.getRootHash(), `Epoch ${epoch} nullifier tree root mismatch`).to.equal(_nullifierTree.getRootHash())
            }
        })
    })
})