import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'
import { computeAttestationHash, computeNullifier } from '../utils'

import {
    genRandomSalt,
    hash5,
    hashLeftRight,
    SnarkBigInt,
} from 'maci-crypto'
import { genIdentity } from 'libsemaphore'

const circuitNullifierTreeDepth = 8

describe('Process attestation circuit', () => {
    let circuit

    const epoch = 1
    const user = genIdentity()
    const NUM_ATTESTATIONS = 3

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

            const sel = Math.floor(Math.random() * 2)
            selectors.push(sel)

            if ( sel == 1) {
                const attestation_hash = computeAttestationHash(attestation)
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
            }

            nullifiers.push(computeNullifier(user['identityNullifier'], attestation['attesterId'], epoch, circuitNullifierTreeDepth))
        }
        hashChainResult = hashLeftRight(1, hashChainResult)
    })

    it('successfully process attestations', async () => {
        const circuitInputs = {
            epoch: epoch,
            identity_nullifier: user['identityNullifier'],
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
        const circuitInputs = {
            epoch: epoch,
            identity_nullifier: user['identityNullifier'],
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

    it('process attestations with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const circuitInputs = {
            epoch: wrongEpoch,
            identity_nullifier: user['identityNullifier'],
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