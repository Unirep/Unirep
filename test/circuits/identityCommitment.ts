import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'

import { genIdentity, genIdentityCommitment } from 'libsemaphore'

describe('(Semaphore) identity commitment', () => {

    it('identity computed should match', async () => {
        const circuit = await compileAndLoadCircuit('test/identityCommitment_test.circom')

        const id = genIdentity()
        const pk = id['keypair']['pubKey']
        const nullifier = id['identityNullifier']
        const trapdoor = id['identityTrapdoor']
        const commitment = genIdentityCommitment(id)

        const circuitInputs = {
            identity_pk: pk,
            identity_nullifier: nullifier,
            identity_trapdoor: trapdoor
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true

        const outputIdx = circuit.getSignalIdx('main.out')
        const output = witness[outputIdx]

        expect(output.toString()).equal(commitment.toString())
    })
})