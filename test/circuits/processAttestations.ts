import { BigNumber } from 'ethers'
import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
    executeCircuit,
    getSignalByName,
} from './utils'
import { genAttestationNullifier, genEpochKey, genEpochKeyNullifier, genNewUserStateTree } from '../utils'

import {
    genRandomSalt,
    hashLeftRight,
    SnarkBigInt,
} from 'maci-crypto'
import { genIdentity } from 'libsemaphore'
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { circuitEpochTreeDepth, circuitNullifierTreeDepth } from "../../config/testLocal"
import { Attestation, Reputation } from "../../core"

describe('Process attestation circuit', function () {
    this.timeout(300000)

    let circuit

    const epoch = 1
    const nonce = 0
    const user = genIdentity()
    const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
    const NUM_ATTESTATIONS = 10

    let userStateTree: SparseMerkleTreeImpl
    let intermediateUserStateTreeRoots, userStateTreePathElements, noAttestationUserStateTreePathElements
    let oldPosReps, oldNegReps, oldGraffities

    let reputationRecords: { [key: string]: Reputation } = {}
    let attesterIds: BigInt[], posReps: BigInt[], negReps: BigInt[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
    let selectors: number[] = []
    let nullifiers: SnarkBigInt[]
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
        overwriteGraffitis = []

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
            const  attesterId = BigInt(i+1)
            if (reputationRecords[attesterId.toString()] === undefined) {
                reputationRecords[attesterId.toString()] = new Reputation(
                    BigInt(Math.floor(Math.random() * 100)),
                    BigInt(Math.floor(Math.random() * 100)),
                    genRandomSalt(),
                )
            } else {
                reputationRecords[attesterId.toString()].update(
                    BigInt(Math.floor(Math.random() * 100)),
                    BigInt(Math.floor(Math.random() * 100)),
                    genRandomSalt(),
                    true
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

        nullifiers = []
        hashChainResult = BigInt(0)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const  attesterId = BigInt(i+1)
            const attestation: Attestation = new Attestation(
                attesterId,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
                true,
            )
            attesterIds.push(attesterId)
            posReps.push(attestation['posRep'])
            negReps.push(attestation['negRep'])
            graffities.push(attestation['graffiti'])
            overwriteGraffitis.push(attestation['overwriteGraffiti'])

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
                    attestation['graffiti'],
                    attestation['overwriteGraffiti']
                )

                await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash())

                nullifiers.push(genAttestationNullifier(user['identityNullifier'], attesterId, epoch, epochKey, circuitNullifierTreeDepth))

                const attestation_hash = attestation.hash()
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
            } else {
                const leafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0))
                userStateTreePathElements.push(leafZeroPathElements)

                nullifiers.push(BigInt(0))
            }
            
            intermediateUserStateTreeRoots.push(userStateTree.getRootHash())
        }
        hashChainResult = hashLeftRight(BigInt(1), hashChainResult)
    })

    it('successfully process attestations', async () => {
        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
            const modedNullifier = BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth)
            expect(BigNumber.from(modedNullifier)).to.equal(BigNumber.from(nullifiers[i]))
        }
        const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, nonce, circuitNullifierTreeDepth)
        const _epkNullifier = getSignalByName(circuit, witness, 'main.epoch_key_nullifier')
        const _modedEPKNullifier = BigInt(_epkNullifier) % BigInt(2 ** circuitNullifierTreeDepth)
        expect(BigNumber.from(epkNullifier)).to.equal(BigNumber.from(_modedEPKNullifier))
    })

    it('successfully process zero attestations', async () => {
        const zeroSelectors = selectors.map(() => 0)
        const noAttestationHashChainResult = hashLeftRight(BigInt(1), BigInt(0))
        const initialUserStateTreeRoot = intermediateUserStateTreeRoots[0]
        const noAttestationIntermediateUserStateTreeRoots = intermediateUserStateTreeRoots.map(() => initialUserStateTreeRoot)
        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: noAttestationIntermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: noAttestationUserStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: zeroSelectors,
            hash_chain_result: noAttestationHashChainResult
        }

        const epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, nonce, circuitNullifierTreeDepth)
        const witness = await executeCircuit(circuit, circuitInputs)
        const _epkNullifier = getSignalByName(circuit, witness, 'main.epoch_key_nullifier')
        const _modedEPKNullifier = BigInt(_epkNullifier) % BigInt(2 ** circuitNullifierTreeDepth)
        expect(BigNumber.from(epkNullifier)).to.equal(BigNumber.from(_modedEPKNullifier))
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
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: wrongOldPosReps,
            old_neg_reps: wrongOldNegReps,
            old_graffities: wrongOldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
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
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: wrongIntermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
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
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
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

    it('process attestations with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const circuitInputs = {
            epoch: wrongEpoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
            const modedNullifier = BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth)
            if (selectors[i] == 0) {
                // If selector is false, nullifier should be zero
                expect(BigNumber.from(modedNullifier)).to.equal(0)
            } else {
                // Otherwise nullifier should not be the same as the correct nullifier
                expect(BigNumber.from(modedNullifier)).to.not.equal(BigNumber.from(nullifiers[i]))
            }
        }
    })

    it('process attestations with wrong nullifier should fail', async () => {
        const otherUser = genIdentity()
        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: otherUser['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const nullifier = getSignalByName(circuit, witness, 'main.nullifiers[' + i + ']')
            const modedNullifier = BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth)
            if (selectors[i] == 0) {
                // If selector is false, nullifier should be zero
                expect(BigNumber.from(modedNullifier)).to.equal(0)
            } else {
                // Otherwise nullifier should not be the same as the correct nullifier
                expect(BigNumber.from(modedNullifier)).to.not.equal(BigNumber.from(nullifiers[i]))
            }
        }
    })

    it('process attestations with incorrect number of elements should fail', async () => {
        const wrongAttesterIds = attesterIds.concat([BigInt(4)])
        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: wrongAttesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
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

    it('process attestations with incorrect hash chain result should fail', async () => {
        const wrongHashChainResult = genRandomSalt()
        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_nullifier: user['identityNullifier'],
            epoch_key: epochKey,
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            path_elements: userStateTreePathElements,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: wrongHashChainResult
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Hash chain result mismatch results from incorrect hash chain result should throw error")
        }
    })
})