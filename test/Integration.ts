import { ethers } from "@nomiclabs/buidler"
import { BigNumber, Contract, Signer, Wallet } from "ethers"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, maxEpochKeyNonce, numAttestationsPerBatch} from '../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, genRandomSalt, stringifyBigInts, hashLeftRight, hashOne } from 'maci-crypto'
import { deployUnirep, genEpochKey, toCompleteHexString, computeEmptyUserStateRoot } from './utils'

chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"
import { Attestation, IAttestation, IEpochTreeLeaf, UnirepState } from "../core/UnirepState"
import { compileAndLoadCircuit, formatProofForVerifierContract, genVerifyEpochKeyProofAndPublicSignals, genVerifyReputationProofAndPublicSignals, genVerifyUserStateTransitionProofAndPublicSignals, verifyEPKProof, verifyProveReputationProof, verifyUserStateTransitionProof } from "./circuits/utils"
import { IUserStateLeaf, UserState } from "../core/UserState"
import { genUnirepStateFromContract } from "../core/utils"

describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    let attesters = new Array(2)

    // Data that are needed for verifying proof
    let userStateLeavesAfterTransition: IUserStateLeaf[][] = new Array(2)
    let graffitiPreImageMap = new Array(2)

    let unirepContract: Contract
    let unirepContractCalledByFisrtAttester, unirepContractCalledBySecondAttester

    let prevEpoch: BigNumber
    let currentEpoch: BigNumber
    let emptyUserStateRoot
    let blankGSLeaf

    let accounts: Signer[]

    let verifyEpochKeyCircuit, verifyUserStateTransitionCircuit, verifyReputationCircuit
    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        verifyEpochKeyCircuit = await compileAndLoadCircuit('test/verifyEpochKey_test.circom')
        verifyUserStateTransitionCircuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
        verifyReputationCircuit = await compileAndLoadCircuit('test/proveReputation_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Total compile time for three circuits: ${endCompileTime - startCompileTime} seconds`)

        accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(<Wallet>accounts[0], "circuit")
        
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
            numAttestationsPerBatch,
        )
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
            users[0] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const GSTreeLeafIndex = 0
            users[0].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
        })

        it('First attester signs up', async () => {
            attesters[0] = new Object()
            attesters[0]['acct'] = accounts[1]
            attesters[0]['addr'] = await attesters[0]['acct'].getAddress()
            unirepContractCalledByFisrtAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[0]['acct'])

            const tx = await unirepContractCalledByFisrtAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[0].id = (await unirepContract.attesters(attesters[0]['addr'])).toNumber()
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                await observedGST.insert(leaf)
            }
            expect(observedGST.root).to.be.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
        const secondEpochEpochKeys: string[] = []
        it('begin first epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await ethers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(2)

            unirepState.epochTransition(prevEpoch.toNumber(), [])
        })

        it('First user transition from first epoch', async () => {
            const epochKeyNonce = 0
            const fromEpoch = users[0].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const oldNullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const nullifiers = users[0].getNullifiers(fromEpoch, epochKeyNonce)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs(epochKeyNonce)
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

            const newState = await users[0].genNewUserStateAfterTransition(epochKeyNonce)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            const noAttestationNullifier = users[0].getNoAttestationsNullifier(prevEpoch.toNumber(), epochKeyNonce)
            let tx = await unirepContract.updateUserStateRoot(
                newState.newGSTLeaf,
                nullifiers,
                noAttestationNullifier,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('Verify state transition of first user', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length).to.be.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length).to.be.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_noAttestationNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid).to.be.true

            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            const noAtteNullifier = BigInt(stateTransitionArgs['_noAttestationNullifier'])
            allNullifiers.push(noAtteNullifier)

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)

            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const GSTreeLeafIndex = 0
            const latestUserStateLeaves = userStateLeavesAfterTransition[0]  // Leaves should be empty as no reputations are given yet
            users[0].transition(
                latestTransitionedToEpoch,
                GSTreeLeafIndex,
                latestUserStateLeaves,
            )
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

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
        })

        it('Second attester signs up', async () => {
            attesters[1] = new Object()
            attesters[1]['acct'] = accounts[2]
            attesters[1]['addr'] = await attesters[1]['acct'].getAddress()
            unirepContractCalledBySecondAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[1]['acct'])
            
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[1].id = (await unirepContract.attesters(attesters[1]['addr'])).toNumber()
        })

        it('Verify epoch key of first user', async () => {
            const epochKeyNonce = 0
            const circuitInputs = await users[0].genVerifyEpochKeyCircuitInputs(epochKeyNonce)
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyEpochKeyCircuit)
            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                firstUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid).to.be.true
        })

        it('First attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                BigInt(attesters[0].id),
                3,
                1,
                hashOne(graffitiPreImage),
                true,
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[0] = new Object()
            graffitiPreImageMap[0][attestation.attesterId.toString()] = graffitiPreImage
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            secondEpochEpochKeys.push(firstUserEpochKey.toString())
            unirepState.addAttestation(firstUserEpochKey.toString(), attestation)

            users[0].addEpochKey(firstUserEpochKey.toString())
        })

        it('Verify epoch key of second user', async () => {
            const epochKeyNonce = 0
            const circuitInputs = await users[1].genVerifyEpochKeyCircuitInputs(epochKeyNonce)
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyEpochKeyCircuit)
            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                secondUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid).to.be.true
        })

        it('First attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                BigInt(attesters[0].id),
                2,
                6,
                hashOne(graffitiPreImage),
                true,
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[1] = new Object()
            graffitiPreImageMap[1][attestation.attesterId.toString()] = graffitiPreImage
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)

            users[1].addEpochKey(secondUserEpochKey.toString())
        })

        it('Second attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                BigInt(attesters[1].id),
                0,
                3,
                hashOne(graffitiPreImage),
                true,
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[0][attestation.attesterId.toString()] = graffitiPreImage
            const tx = await unirepContractCalledBySecondAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)

            users[1].addEpochKey(secondUserEpochKey.toString())
        })

        it('Attestations gathered from events should match', async () => {
            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            expect(attestationsByEpochEvent.length).to.be.equal(3)

            // Second filter by attester
            for (let attester of attesters) {
                let attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, attester['addr'])
                let attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
                if (attester.id == 1) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(2)
                } else if (attester.id == 2) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(1)
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
                expect(attestationsByEpochKeyEvent.length).to.be.equal(attestations.length)

                for (let i = 0; i < attestations_.length; i++) {
                    expect(attestations[i]['attesterId']).to.be.equal(attestations_[i]['attesterId'])
                    expect(attestations[i]['posRep']).to.be.equal(attestations_[i]['posRep'])
                    expect(attestations[i]['negRep']).to.be.equal(attestations_[i]['negRep'])
                    expect(attestations[i]['graffiti']).to.be.equal(attestations_[i]['graffiti'])
                    expect(attestations[i]['overwriteGraffiti']).to.be.equal(attestations_[i]['overwriteGraffiti'])
                }
            }
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                await observedGST.insert(leaf)
            }
            expect(observedGST.root).to.be.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    describe('Third epoch', () => {
        it('begin second epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await ethers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(3)

            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(prevEpoch)
            expect(epochKeys_.length).to.be.equal(2)

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
        })

        it('First user transition from second epoch', async () => {
            const epochKeyNonce = 0
            const fromEpoch = users[0].latestTransitionedEpoch
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, fromEpoch, epochKeyNonce, circuitEpochTreeDepth)
            expect(unirepState.getAttestations(firstUserEpochKey.toString()).length).to.be.equal(1)

            const fromEpochGSTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const oldNullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const nullifiers = users[0].getNullifiers(fromEpoch, epochKeyNonce)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs(epochKeyNonce)
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyUserStateTransitionCircuit)
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

            const newState = await users[0].genNewUserStateAfterTransition(epochKeyNonce)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            const noAttestationNullifier = users[0].getNoAttestationsNullifier(fromEpoch, epochKeyNonce)

            let tx = await unirepContract.updateUserStateRoot(
                newState.newGSTLeaf,
                nullifiers,
                noAttestationNullifier,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                oldNullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('Verify state transition of first user', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length).to.be.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length).to.be.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_noAttestationNullifier'],
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid).to.be.true

            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => BigInt(n))
            const allNullifiers: BigInt[] = nullifiers.slice()
            const noAtteNullifier = BigInt(stateTransitionArgs['_noAttestationNullifier'])
            allNullifiers.push(noAtteNullifier)

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeafArgs['_hashedLeaf']), allNullifiers)

            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const GSTreeLeafIndex = 0
            const latestUserStateLeaves = userStateLeavesAfterTransition[0]
    
            users[0].transition(
                latestTransitionedToEpoch,
                GSTreeLeafIndex,
                latestUserStateLeaves,
            )
        })

        it('First user prove his reputation', async () => {
            const attesterId = BigInt(1)  // Prove reputation received from first attester
            const minPosRep = 1
            const maxNegRep = 10
            const graffitiPreImage = graffitiPreImageMap[0][attesterId.toString()]
            const circuitInputs = await users[0].genProveReputationCircuitInputs(attesterId, minPosRep, maxNegRep, graffitiPreImage)
            const startTime = Math.floor(new Date().getTime() / 1000)
            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs), verifyReputationCircuit)
            const endTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true

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
            expect(isProofValid).to.be.true
        })

        it('genUnirepStateFromContract should return equivalent UnirepState', async () => {
            const unirepStateFromContract = await genUnirepStateFromContract(
                ethers.provider,
                unirepContract.address,
                0,
            )

            expect(unirepState.currentEpoch).equal(unirepStateFromContract.currentEpoch)
            for (let epoch = 1; epoch <= unirepState.currentEpoch; epoch++) {
                const GST = unirepState.genGSTree(epoch)
                const _GST = unirepStateFromContract.genGSTree(epoch)
                expect(GST.root).equal(_GST.root)

                const epochTree = await unirepState.genEpochTree(epoch)
                const _epochTree = await unirepStateFromContract.genEpochTree(epoch)
                expect(await epochTree.getRootHash()).equal(await _epochTree.getRootHash())

                const nullifierTree = await unirepState.genNullifierTree()
                const _nullifierTree = await unirepStateFromContract.genNullifierTree()
                expect(await nullifierTree.getRootHash()).equal(await _nullifierTree.getRootHash())
            }
        })
    })
})