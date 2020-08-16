import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'
import { computeAttestationHash } from '../utils'

import {
    genRandomSalt,
    hash5,
    hashLeftRight,
    SnarkBigInt,
} from 'maci-crypto'
import { genIdentity } from 'libsemaphore'

describe('Hash chain circuit', () => {

    it('successfully process attestations', async () => {
        const circuit = await compileAndLoadCircuit('test/processAttestations_test.circom')

        const epoch = 1
        const user = genIdentity()

        const NUM_ATTESTATIONS = 3
        const attesterIds: SnarkBigInt[] = []
        const posReps: number[] = []
        const negReps: number[] = []
        const graffities: SnarkBigInt[] = []
        const overwriteGraffitis: boolean[] = []

        const nullifiers: SnarkBigInt[] = []
        let hash_chain_result = 0
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

            const attestation_hash = computeAttestationHash(attestation)
            hash_chain_result = hashLeftRight(attestation_hash, hash_chain_result)

            nullifiers[i] = hash5([user['identityNullifier'], attestation['attesterId'], epoch, 0, 0])
        }
        hash_chain_result = hashLeftRight(1, hash_chain_result)

        const circuitInputs = {
            epoch: epoch,
            identity_nullifier: user['identityNullifier'],
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            hash_chain_result: hash_chain_result
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            expect(witness[circuit.getSignalIdx('main.nullifiers[' + i + ']')])
                .to.equal(nullifiers[i])
        }
    })

    it('process attestations with wrong inputs should fail', async () => {
        const circuit = await compileAndLoadCircuit('test/processAttestations_test.circom')

        const epoch = 1
        const user = genIdentity()

        const NUM_ATTESTATIONS = 3
        const attesterIds: SnarkBigInt[] = []
        const posReps: number[] = []
        const negReps: number[] = []
        const graffities: SnarkBigInt[] = []
        const overwriteGraffitis: boolean[] = []

        const nullifiers: SnarkBigInt[] = []
        let hash_chain_result = 0
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

            const attestation_hash = computeAttestationHash(attestation)
            hash_chain_result = hashLeftRight(attestation_hash, hash_chain_result)

            nullifiers[i] = hash5([user['identityNullifier'], attestation['attesterId'], epoch, 0, 0])
        }
        hash_chain_result = hashLeftRight(1, hash_chain_result)

        // Verify against wrong epoch
        const wrongEpoch = epoch + 1
        let circuitInputs = {
            epoch: wrongEpoch,
            identity_nullifier: user['identityNullifier'],
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            hash_chain_result: hash_chain_result
        }

        let witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            expect(witness[circuit.getSignalIdx('main.nullifiers[' + i + ']')])
                .to.not.equal(nullifiers[i])
        }

        // Verify against wrong nullifier
        const otherUser = genIdentity()
        circuitInputs = {
            epoch: epoch,
            identity_nullifier: otherUser['identityNullifier'],
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            hash_chain_result: hash_chain_result
        }

        witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            expect(witness[circuit.getSignalIdx('main.nullifiers[' + i + ']')])
                .to.not.equal(nullifiers[i])
        }

        // Verify against incorrect number of elements
        const wrongAttesterIds = attesterIds.concat([4])
        circuitInputs = {
            epoch: epoch,
            identity_nullifier: user['identityNullifier'],
            attester_ids: wrongAttesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            hash_chain_result: hash_chain_result
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw()

        // Verify against incorrect hash chain result
        const wrongHashChainResult = genRandomSalt()
        circuitInputs = {
            epoch: epoch,
            identity_nullifier: user['identityNullifier'],
            attester_ids: wrongAttesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            hash_chain_result: wrongHashChainResult
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw()
    })
})