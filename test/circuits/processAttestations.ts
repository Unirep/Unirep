import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'
import { computeAttestationHash, computeNullifier, getNewSMT, bufToBigInt, bigIntToBuf } from '../utils'

import {
    genRandomSalt,
    hash5,
    hashLeftRight,
    SnarkBigInt,
    hashOne,
} from 'maci-crypto'
import { genIdentity } from 'libsemaphore'
import { BigNumber as smtBN, SparseMerkleTreeImpl } from "../../crypto/SMT"

const circuitNullifierTreeDepth = 8
const circuitUserStateTreeDepth = 4

describe('Process attestation circuit', () => {
    let circuit

    const epoch = 1
    const user = genIdentity()
    const NUM_ATTESTATIONS = 3

    let userStateTree: SparseMerkleTreeImpl
    const ONE_LEAF = bigIntToBuf(hashLeftRight(1, 0))
    let intermediateUserStateTreeRoots, userStateTreePathElements, noAttestationUserStateTreePathElements
    let oldPosReps, oldNegReps, oldGraffities

    let attestationRecords = {}
    let attesterIds: SnarkBigInt[], posReps: number[], negReps: number[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
    let selectors: number[] = []
    let nullifiers: SnarkBigInt[]
    let hashChainResult: SnarkBigInt

    before(async () => {
        circuit = await compileAndLoadCircuit('test/processAttestations_test.circom')

        attesterIds = []
        posReps = []
        negReps = []
        graffities = []
        overwriteGraffitis = []

        // User state
        const defaultUserStateLeaf = hash5([0, 0, 0, 0, 0])
        userStateTree = await getNewSMT(circuitUserStateTreeDepth, defaultUserStateLeaf)
        intermediateUserStateTreeRoots = []
        userStateTreePathElements = []
        noAttestationUserStateTreePathElements = []
        oldPosReps = []
        oldNegReps = []
        oldGraffities = []
        // Reserve leaf 0
        let result 
        result = await userStateTree.update(new smtBN(0), ONE_LEAF, true)
        expect(result).to.be.true
        intermediateUserStateTreeRoots.push(bufToBigInt(userStateTree.getRootHash()))
        const leafZeroProof = await userStateTree.getMerkleProof(new smtBN(0), ONE_LEAF, true)
        const leafZeroPathElements = leafZeroProof.siblings.map((p) => bufToBigInt(p))
        for (let i = 0; i < NUM_ATTESTATIONS; i++) noAttestationUserStateTreePathElements.push(leafZeroPathElements)

        // Ensure as least one of the selectors is true
        const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            if (i == selTrue) selectors.push(1)
            else selectors.push(Math.floor(Math.random() * 2))
        }

        nullifiers = []
        hashChainResult = 0
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const attestation = {
                attesterId: i + 1,
                posRep: Math.floor(Math.random() * 100),
                negRep: Math.floor(Math.random() * 100),
                graffiti: genRandomSalt(),
                overwriteGraffiti: true,
            }
            attesterIds.push(attestation['attesterId'])
            posReps.push(attestation['posRep'])
            negReps.push(attestation['negRep'])
            graffities.push(attestation['graffiti'])
            overwriteGraffitis.push(attestation['overwriteGraffiti'])

            if (attestationRecords[attestation['attesterId']] === undefined) {
                attestationRecords[attestation['attesterId']] = {
                    posRep: 0,
                    negRep: 0,
                    graffiti: 0,
                }
            }
            oldPosReps.push(attestationRecords[attestation['attesterId']]['posRep'])
            oldNegReps.push(attestationRecords[attestation['attesterId']]['negRep'])
            oldGraffities.push(attestationRecords[attestation['attesterId']]['graffiti'])

            if (selectors[i] == 1) {
                // Get old attestation record
                const oldAttestationRecord = hash5([
                    attestationRecords[attestation['attesterId']]['posRep'],
                    attestationRecords[attestation['attesterId']]['negRep'],
                    attestationRecords[attestation['attesterId']]['graffiti'],
                    0,
                    0
                ])
                const oldAttestationRecordProof = await userStateTree.getMerkleProof(new smtBN(attestation['attesterId']), bigIntToBuf(oldAttestationRecord), true)
                userStateTreePathElements.push(oldAttestationRecordProof.siblings.map((p) => bufToBigInt(p)))

                // Update attestation record
                attestationRecords[attestation['attesterId']]['posRep'] += attestation['posRep']
                attestationRecords[attestation['attesterId']]['negRep'] += attestation['negRep']
                if (attestation['overwriteGraffiti']) attestationRecords[attestation['attesterId']]['graffiti'] = attestation['graffiti']
                const newAttestationRecord = hash5([
                    attestationRecords[attestation['attesterId']]['posRep'],
                    attestationRecords[attestation['attesterId']]['negRep'],
                    attestationRecords[attestation['attesterId']]['graffiti'],
                    0,
                    0
                ])
                result = await userStateTree.update(new smtBN(attestation['attesterId']), bigIntToBuf(newAttestationRecord), true)
                expect(result).to.be.true

                const attestation_hash = computeAttestationHash(attestation)
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
            } else {
                const leafZeroProof = await userStateTree.getMerkleProof(new smtBN(0), ONE_LEAF, true)
                const leafZeroPathElements = leafZeroProof.siblings.map((p) => bufToBigInt(p))
                userStateTreePathElements.push(leafZeroPathElements)
            }
            
            intermediateUserStateTreeRoots.push(bufToBigInt(userStateTree.getRootHash()))
            nullifiers.push(computeNullifier(user['identityNullifier'], attestation['attesterId'], epoch, circuitNullifierTreeDepth))
        }
        hashChainResult = hashLeftRight(1, hashChainResult)
    })

    it('successfully process attestations', async () => {
        const circuitInputs = {
            epoch: epoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            expect(witness[circuit.getSignalIdx('main.nullifiers[' + i + ']')])
                .to.equal(nullifiers[i])
        }
    })

    it('successfully process zero attestations', async () => {
        const zeroSelectors = selectors.map(() => 0)
        const noAttestationHashChainResult = hashLeftRight(1, 0)
        const initialUserStateTreeRoot = intermediateUserStateTreeRoots[0]
        const noAttestationIntermediateUserStateTreeRoots = intermediateUserStateTreeRoots.map(() => initialUserStateTreeRoot)
        const circuitInputs = {
            epoch: epoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: zeroSelectors,
            hash_chain_result: noAttestationHashChainResult
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
    })

    it('process attestations with wrong attestation record should not work', async () => {
        let indexWrongAttestationRecord = Math.floor(Math.random() * NUM_ATTESTATIONS)
        while (selectors[indexWrongAttestationRecord] == 0) indexWrongAttestationRecord = (indexWrongAttestationRecord + 1) % NUM_ATTESTATIONS
        const wrongOldPosReps = oldPosReps.slice()
        wrongOldPosReps[indexWrongAttestationRecord] += Math.floor(Math.random() * 100)
        const wrongOldNegReps = oldNegReps.slice()
        wrongOldNegReps[indexWrongAttestationRecord] += Math.floor(Math.random() * 100)
        const wrongOldGraffities = oldGraffities.slice()
        wrongOldGraffities[indexWrongAttestationRecord] = genRandomSalt()
        const circuitInputs = {
            epoch: epoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        const rootNotMatchRegExp = RegExp('.+ -> ' + intermediateUserStateTreeRoots[indexWrongAttestationRecord] + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(rootNotMatchRegExp)
    })

    it('process attestations with wrong intermediate roots should not work', async () => {
        const wrongIntermediateUserStateTreeRoots = intermediateUserStateTreeRoots.slice()
        const indexWrongRoot = Math.floor(Math.random() * NUM_ATTESTATIONS)
        wrongIntermediateUserStateTreeRoots[indexWrongRoot] = genRandomSalt()
        const circuitInputs = {
            epoch: epoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        const rootNotMatchRegExp = RegExp('.+ -> .+ != ' + intermediateUserStateTreeRoots[indexWrongRoot] + '$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(rootNotMatchRegExp)
    })

    it('process attestations with wrong path elements should not work', async () => {
        const indexWrongPathElements = Math.floor(Math.random() * NUM_ATTESTATIONS)
        userStateTreePathElements[indexWrongPathElements].reverse()
        const circuitInputs = {
            epoch: epoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }
        
        const rootNotMatchRegExp = RegExp('.+ -> ' + intermediateUserStateTreeRoots[indexWrongPathElements] + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(rootNotMatchRegExp)

        userStateTreePathElements[indexWrongPathElements].reverse()
    })

    it('process attestations with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const circuitInputs = {
            epoch: wrongEpoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            expect(witness[circuit.getSignalIdx('main.nullifiers[' + i + ']')])
                .to.not.equal(nullifiers[i])
        }
    })

    it('process attestations with wrong nullifier should fail', async () => {
        const otherUser = genIdentity()
        const circuitInputs = {
            epoch: epoch,
            identity_nullifier: otherUser['identityNullifier'],
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

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            expect(witness[circuit.getSignalIdx('main.nullifiers[' + i + ']')])
                .to.not.equal(nullifiers[i])
        }
    })

    it('process attestations with incorrect number of elements should fail', async () => {
        const wrongAttesterIds = attesterIds.concat([4])
        const circuitInputs = {
            epoch: epoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: hashChainResult
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw('Invalid signal identifier: main.attester_ids[' + NUM_ATTESTATIONS + ']')
    })

    it('process attestations with incorrect hash chain result should fail', async () => {
        const wrongHashChainResult = genRandomSalt()
        const circuitInputs = {
            epoch: epoch,
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
            overwrite_graffitis: overwriteGraffitis,
            selectors: selectors,
            hash_chain_result: wrongHashChainResult
        }

        const resultNotMatchRegExp = RegExp('.+ -> ' + wrongHashChainResult + ' != ' + hashChainResult + '$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(resultNotMatchRegExp)
    })
})