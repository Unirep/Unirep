import * as path from 'path'
import { expect } from 'chai'
import {
    genRandomSalt,
    IncrementalMerkleTree,
    hashOne,
    SnarkBigInt,
} from '@unirep/crypto'
import { executeCircuit, getSignalByName } from '../src'
import { compileAndLoadCircuit } from './utils'

const LEVELS = 4
const InclusionProofCircuitPath = path.join(
    __dirname,
    '../circuits/test/merkleTreeInclusionProof_test.circom'
)

describe('Merkle Tree circuits', function () {
    this.timeout(30000)

    describe('MerkleTreeInclusionProof', () => {
        let circuit

        before(async () => {
            circuit = await compileAndLoadCircuit(InclusionProofCircuitPath)
        })

        it('Valid update proofs should work', async () => {
            const tree = new IncrementalMerkleTree(LEVELS)

            // Populate the tree
            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = hashOne(randomVal)
                tree.insert(leaf)
            }

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = hashOne(randomVal)

                tree.update(i, leaf)

                const proof = tree.createProof(i)

                const root = tree.root

                const circuitInputs = {
                    leaf: leaf.toString(),
                    path_elements: proof.siblings,
                    path_index: proof.pathIndices,
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                const circuitRoot = getSignalByName(
                    circuit,
                    witness,
                    'main.root'
                ).toString()
                expect(circuitRoot).to.equal(root.toString())
            }
        })

        it('Invalid update proofs should not work', async () => {
            const tree = new IncrementalMerkleTree(LEVELS)

            // Populate the tree
            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = hashOne(randomVal)
                tree.insert(leaf)
            }

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = hashOne(randomVal)

                tree.update(i, leaf)

                const proof = tree.createProof(i)

                // Delibrately create an invalid proof
                proof.siblings[0][0] = BigInt(1)

                const isValid = tree.verifyProof(proof)
                expect(isValid).to.be.false

                const circuitInputs = {
                    leaf: leaf.toString(),
                    path_elements: proof.siblings,
                    path_index: proof.pathIndices,
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                const circuitRoot = getSignalByName(
                    circuit,
                    witness,
                    'main.root'
                ).toString()
                expect(circuitRoot).not.to.equal(tree.root.toString())
            }
        })
    })
})
