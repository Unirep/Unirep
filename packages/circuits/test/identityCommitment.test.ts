import * as path from 'path'
import * as circom from 'circom'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'

const circuitPath = path.join(
    __dirname,
    '../circuits/test/identityCommitment_test.circom'
)

describe('(Semaphore) identity commitment', function () {
    this.timeout(200000)

    it('identity computed should match', async () => {
        const circuit = await circom.tester(circuitPath)
        await circuit.loadSymbols()
        const id: ZkIdentity = new ZkIdentity()
        const nullifier = id.identityNullifier
        const trapdoor = id.trapdoor
        const commitment = id.genIdentityCommitment()

        const circuitInputs = {
            identity_nullifier: nullifier,
            identity_trapdoor: trapdoor,
        }

        const witness = await circuit.calculateWitness(circuitInputs, true)
        await circuit.checkConstraints(witness)
        const output = witness[circuit.symbols['main.out'].varIdx]

        expect(output.toString()).equal(commitment.toString())
    })
})
