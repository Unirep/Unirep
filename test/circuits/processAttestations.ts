import chai from "chai"
const { expect } = chai

import {
    compileAndLoadCircuit,
    executeCircuit,
    getSignalByName,
} from './utils'
import { genEpochKey, genNewUserStateTree } from '../utils'

import {
    genRandomSalt,
    hash5,
    hashLeftRight,
    SnarkBigInt,
} from 'maci-crypto'
import { genIdentity } from 'libsemaphore'
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { circuitEpochTreeDepth } from "../../config/testLocal"
import { Attestation, Reputation } from "../../core"

describe('Process attestation circuit', function () {
    this.timeout(300000)

    let circuit

    const epoch = 1
    const nonce = 0
    const toNonce = 1
    const user = genIdentity()
    const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
    let attestationIdxStarter = 0
    const NUM_ATTESTATIONS = 10

    let userStateTree: SparseMerkleTreeImpl
    let intermediateUserStateTreeRoots, userStateTreePathElements, noAttestationUserStateTreePathElements
    let oldPosReps, oldNegReps, oldGraffities
    let hashChainStarter = genRandomSalt()
    let inputBlindedUserState

    let reputationRecords: { [key: string]: Reputation } = {}
    let attesterIds: BigInt[], posReps: BigInt[], negReps: BigInt[], graffities: SnarkBigInt[]
    let selectors: number[] = []
    let hashChainResult: SnarkBigInt

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit('test/processAttestations_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        attesterIds = []
        posReps = []
        negReps = []
        graffities = []

        // User state
        userStateTree = await genNewUserStateTree("circuit")
        intermediateUserStateTreeRoots = []
        userStateTreePathElements = []
        noAttestationUserStateTreePathElements = []  // User merkle proof of leaf 0 if no attestation to process
        oldPosReps = []
        oldNegReps = []
        oldGraffities = []

        // Bootstrap user state
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const  attesterId = BigInt(i + 1)
            if (reputationRecords[attesterId.toString()] === undefined) {
                reputationRecords[attesterId.toString()] = new Reputation(
                    BigInt(Math.floor(Math.random() * 100)),
                    BigInt(Math.floor(Math.random() * 100)),
                    genRandomSalt(),
                )
            }
            await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash())
        }
        intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
        const leafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
        for (let i = 0; i < NUM_ATTESTATIONS; i++) noAttestationUserStateTreePathElements.push(leafZeroPathElements)

        // Ensure as least one of the selectors is true
        const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            if (i == selTrue) selectors.push(1)
            else selectors.push(Math.floor(Math.random() * 2))
        }

        hashChainResult = hashChainStarter
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const attesterId = BigInt(i + 1)
            const attestation: Attestation = new Attestation(
                attesterId,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
            )
            attesterIds.push(attesterId)
            posReps.push(attestation['posRep'])
            negReps.push(attestation['negRep'])
            graffities.push(attestation['graffiti'])

            oldPosReps.push(reputationRecords[attesterId.toString()]['posRep'])
            oldNegReps.push(reputationRecords[attesterId.toString()]['negRep'])
            oldGraffities.push(reputationRecords[attesterId.toString()]['graffiti'])

            if (selectors[i] == 1) {
                // Get old reputation record proof
                const oldReputationRecordProof = await userStateTree.getMerkleProof(attesterId)
                userStateTreePathElements.push(oldReputationRecordProof)

                // Update reputation record
                reputationRecords[attesterId.toString()].update(
                    attestation['posRep'],
                    attestation['negRep'],
                    attestation['graffiti']
                )

                await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash())

                const attestation_hash = attestation.hash()
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
            } else {
                const leafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                userStateTreePathElements.push(leafZeroPathElements)
            }
            
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
        }
        inputBlindedUserState = hash5([user['identityNullifier'], intermediateUserStateTreeRoots[0], nonce])
    })

    it('successfully process attestations', async () => {
        const circuitInputs = {
            from_nonce: nonce,
            to_nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }
        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const expectedUserState = hash5([user['identityNullifier'], intermediateUserStateTreeRoots[NUM_ATTESTATIONS], nonce])
        expect(outputUserState).to.equal(expectedUserState)
        inputBlindedUserState = outputUserState

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, nonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
    })

    it('successfully process zero attestations', async () => {
        const zeroSelectors = selectors.map(() => 0)
        const noAttestationHashChainResult = hashChainStarter
        const initialUserStateTreeRoot = intermediateUserStateTreeRoots[0]
        const noAttestationIntermediateUserStateTreeRoots = intermediateUserStateTreeRoots.map(() => initialUserStateTreeRoot)
        const zeroInputUserState = hash5([user['identityNullifier'], initialUserStateTreeRoot, nonce])
        const zeroInputHashChain = hash5([user['identityNullifier'], noAttestationHashChainResult, nonce])
        const circuitInputs = {
            from_nonce: nonce,
            to_nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: noAttestationIntermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: noAttestationUserStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: zeroSelectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: zeroInputUserState,
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const expectedUserState = hash5([user['identityNullifier'], noAttestationIntermediateUserStateTreeRoots[NUM_ATTESTATIONS], nonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], noAttestationHashChainResult, nonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
    })

    it('successfully continue to process attestations', async () => {
        hashChainStarter = hashChainResult

        attestationIdxStarter = NUM_ATTESTATIONS
        oldPosReps = []
        oldNegReps = []
        oldGraffities = []
        attesterIds = []
        posReps = []
        negReps = []
        graffities = []
        selectors = []

        intermediateUserStateTreeRoots = []
        userStateTreePathElements = []
        intermediateUserStateTreeRoots.push(userStateTree.getRootHash())

        // Ensure as least one of the selectors is true
        const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            if (i == selTrue) selectors.push(1)
            else selectors.push(Math.floor(Math.random() * 2))
        }

        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const attesterId = BigInt(i + 1)
            const attestation: Attestation = new Attestation(
                attesterId,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
            )
            attesterIds.push(attesterId)
            posReps.push(attestation['posRep'])
            negReps.push(attestation['negRep'])
            graffities.push(attestation['graffiti'])
            
            if (selectors[i] == 1) {
                // Get old reputation record
                oldPosReps.push(reputationRecords[attesterId.toString()].posRep)
                oldNegReps.push(reputationRecords[attesterId.toString()].negRep)
                oldGraffities.push(reputationRecords[attesterId.toString()].graffiti)

                // Get old reputation record proof
                const oldReputationRecordProof = await userStateTree.getMerkleProof(attesterId)
                userStateTreePathElements.push(oldReputationRecordProof)

                // Update reputation record
                reputationRecords[attesterId.toString()].update(
                    attestation['posRep'],
                    attestation['negRep'],
                    attestation['graffiti']
                )

                await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash())

                const attestation_hash = attestation.hash()
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
            } else {
                oldPosReps.push(BigInt(0))
                oldNegReps.push(BigInt(0))
                oldGraffities.push(BigInt(0))

                const leafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                userStateTreePathElements.push(leafZeroPathElements)
            }
            
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
        }

        const circuitInputs = {
            from_nonce: nonce,
            to_nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }
        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const expectedUserState = hash5([user['identityNullifier'], intermediateUserStateTreeRoots[NUM_ATTESTATIONS], nonce])
        expect(outputUserState).to.equal(expectedUserState)
        inputBlindedUserState = outputUserState

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, nonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
    })

    it('successfully continue to process attestations to next epoch key', async () => {
        hashChainStarter = hashChainResult

        attestationIdxStarter = NUM_ATTESTATIONS
        oldPosReps = []
        oldNegReps = []
        oldGraffities = []
        attesterIds = []
        posReps = []
        negReps = []
        graffities = []
        selectors = []

        intermediateUserStateTreeRoots = []
        userStateTreePathElements = []
        intermediateUserStateTreeRoots.push(userStateTree.getRootHash())

        // Ensure as least one of the selectors is true
        const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            if (i == selTrue) selectors.push(1)
            else selectors.push(Math.floor(Math.random() * 2))
        }

        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const attesterId = BigInt(i + 1)
            const attestation: Attestation = new Attestation(
                attesterId,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
            )
            attesterIds.push(attesterId)
            posReps.push(attestation['posRep'])
            negReps.push(attestation['negRep'])
            graffities.push(attestation['graffiti'])
            
            if (selectors[i] == 1) {
                // Get old reputation record
                oldPosReps.push(reputationRecords[attesterId.toString()].posRep)
                oldNegReps.push(reputationRecords[attesterId.toString()].negRep)
                oldGraffities.push(reputationRecords[attesterId.toString()].graffiti)

                // Get old reputation record proof
                const oldReputationRecordProof = await userStateTree.getMerkleProof(attesterId)
                userStateTreePathElements.push(oldReputationRecordProof)

                // Update reputation record
                reputationRecords[attesterId.toString()].update(
                    attestation['posRep'],
                    attestation['negRep'],
                    attestation['graffiti']
                )

                await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash())

                const attestation_hash = attestation.hash()
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
            } else {
                oldPosReps.push(BigInt(0))
                oldNegReps.push(BigInt(0))
                oldGraffities.push(BigInt(0))

                const leafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                userStateTreePathElements.push(leafZeroPathElements)
            }
            
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
        }

        const circuitInputs = {
            from_nonce: nonce,
            to_nonce: toNonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }
        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const expectedUserState = hash5([user['identityNullifier'], intermediateUserStateTreeRoots[NUM_ATTESTATIONS], toNonce])
        expect(outputUserState).to.equal(expectedUserState)
        inputBlindedUserState = outputUserState

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, toNonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
    })

    it('Same attester give reputation to same epoch keys should work', async () => {
        hashChainStarter = hashChainResult

        attestationIdxStarter = NUM_ATTESTATIONS * 2
        oldPosReps = []
        oldNegReps = []
        oldGraffities = []
        attesterIds = []
        posReps = []
        negReps = []
        graffities = []
        selectors = []

        intermediateUserStateTreeRoots = []
        userStateTreePathElements = []
        intermediateUserStateTreeRoots.push(userStateTree.getRootHash())

        // Ensure as least one of the selectors is true
        const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            if (i == selTrue) selectors.push(1)
            else selectors.push(Math.floor(Math.random() * 2))
        }

        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const attesterId = BigInt(i + 1)
            const attestation: Attestation = new Attestation(
                attesterId,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
            )
            attesterIds.push(attesterId)
            posReps.push(attestation['posRep'])
            negReps.push(attestation['negRep'])
            graffities.push(attestation['graffiti'])
            
            if (selectors[i] == 1) {
                // Get old reputation record
                oldPosReps.push(reputationRecords[attesterId.toString()].posRep)
                oldNegReps.push(reputationRecords[attesterId.toString()].negRep)
                oldGraffities.push(reputationRecords[attesterId.toString()].graffiti)

                // Get old reputation record proof
                const oldReputationRecordProof = await userStateTree.getMerkleProof(attesterId)
                userStateTreePathElements.push(oldReputationRecordProof)

                // Update reputation record
                reputationRecords[attesterId.toString()].update(
                    attestation['posRep'],
                    attestation['negRep'],
                    attestation['graffiti']
                )

                await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash())

                const attestation_hash = attestation.hash()
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
            } else {
                oldPosReps.push(BigInt(0))
                oldNegReps.push(BigInt(0))
                oldGraffities.push(BigInt(0))
                
                const leafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                userStateTreePathElements.push(leafZeroPathElements)
            }
            
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
        }

        const circuitInputs = {
            from_nonce: toNonce,
            to_nonce: toNonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }
        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const expectedUserState = hash5([user['identityNullifier'], intermediateUserStateTreeRoots[NUM_ATTESTATIONS], toNonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, toNonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
    })

    

    it('process attestations with wrong attestation record should not work', async () => {
        let indexWrongAttestationRecord = Math.floor(Math.random() * NUM_ATTESTATIONS)
        while (selectors[indexWrongAttestationRecord] == 0) indexWrongAttestationRecord = (indexWrongAttestationRecord + 1) % NUM_ATTESTATIONS
        const wrongOldPosReps = oldPosReps.slice()
        wrongOldPosReps[indexWrongAttestationRecord] = BigInt(Math.floor(Math.random() * 100))
        const wrongOldNegReps = oldNegReps.slice()
        wrongOldNegReps[indexWrongAttestationRecord] = BigInt(Math.floor(Math.random() * 100))
        const wrongOldGraffities = oldGraffities.slice()
        wrongOldGraffities[indexWrongAttestationRecord] = genRandomSalt()
        const circuitInputs = {
            from_nonce: toNonce,
            to_nonce: toNonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: wrongOldPosReps,
            old_neg_reps: wrongOldNegReps,
            old_graffities: wrongOldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Root mismatch results from wrong attestation record should throw error")
        }
    })

    it('process attestations with wrong intermediate roots should not work', async () => {
        const wrongIntermediateUserStateTreeRoots = intermediateUserStateTreeRoots.slice()
        const indexWrongRoot = Math.floor(Math.random() * NUM_ATTESTATIONS)
        wrongIntermediateUserStateTreeRoots[indexWrongRoot] = genRandomSalt()
        const circuitInputs = {
            from_nonce: toNonce,
            to_nonce: toNonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: wrongIntermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Root mismatch results from wrong intermediate roots should throw error")
        }
    })

    it('process attestations with wrong path elements should not work', async () => {
        const indexWrongPathElements = Math.floor(Math.random() * NUM_ATTESTATIONS)
        userStateTreePathElements[indexWrongPathElements].reverse()
        const circuitInputs = {
            from_nonce: toNonce,
            to_nonce: toNonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }
        
        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Root mismatch results from wrong path elements should throw error")
        }

        userStateTreePathElements[indexWrongPathElements].reverse()
    })

    it('process attestations with incorrect number of elements should fail', async () => {
        const wrongAttesterIds = attesterIds.concat([BigInt(4)])
        const circuitInputs = {
            from_nonce: toNonce,
            to_nonce: toNonce,
            identity_nullifier: user['identityNullifier'],
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: wrongAttesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            selectors: selectors,
            hash_chain_starter: hashChainStarter,
            input_blinded_user_state: inputBlindedUserState,
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Incorrect number of elements should throw error")
        }
    })
})