import * as path from 'path'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { executeCircuit, getSignalByName } from '../circuits/utils'
import { compileAndLoadCircuit } from './utils'

const circuitPath = path.join(
    __dirname,
    '../circuits/test/identityCommitment_test.circom'
)

describe('(Semaphore) identity commitment', function () {
    this.timeout(200000)

    it('identity computed should match', async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        const circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(
            `Compile time: ${endCompileTime - startCompileTime} seconds`
        )

        const id: ZkIdentity = new ZkIdentity()
        const nullifier = id.getNullifier()
        const trapdoor = id.trapdoor
        const commitment = id.genIdentityCommitment()

        const circuitInputs = {
            identity_nullifier: nullifier,
            identity_trapdoor: trapdoor,
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const output = getSignalByName(circuit, witness, 'main.out')

        expect(output.toString()).equal(commitment.toString())
    })
})
