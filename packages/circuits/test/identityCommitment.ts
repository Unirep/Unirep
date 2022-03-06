import * as path from 'path'
import { expect } from "chai"
import { genIdentity, genIdentityCommitment } from "@unirep/crypto"
import { executeCircuit, getSignalByName, } from "../circuits/utils"
import { compileAndLoadCircuit } from './utils'

const circuitPath = path.join(__dirname, '../circuits/test/identityCommitment_test.circom')

describe('(Semaphore) identity commitment', function () {
    this.timeout(200000)

    it('identity computed should match', async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        const circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

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

        const witness = await executeCircuit(circuit, circuitInputs)
        const output = getSignalByName(circuit, witness, 'main.out')


        expect(output.toString()).equal(commitment.toString())
    })
})