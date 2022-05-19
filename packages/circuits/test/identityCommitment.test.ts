import * as path from 'path'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'

import UnirepCircuit from '../src'

const circuitPath = path.join(
    __dirname,
    '../circuits/test/identityCommitment_test.circom'
)

describe('(Semaphore) identity commitment', function () {
    this.timeout(200000)

    it('identity computed should match', async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        const circuit = await UnirepCircuit.compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(
            `Compile time: ${endCompileTime - startCompileTime} seconds`
        )

        const id: ZkIdentity = new ZkIdentity()
        const nullifier = id.getNullifier()
        const trapdoor = id.getTrapdoor()
        const commitment = id.genIdentityCommitment()

        const circuitInputs = {
            identity_nullifier: nullifier,
            identity_trapdoor: trapdoor,
        }

        const witness = await UnirepCircuit.executeCircuit(circuit, circuitInputs)
        const output = UnirepCircuit.getSignalByName(circuit, witness, 'main.out')

        expect(output.toString()).equal(commitment.toString())
    })
})
