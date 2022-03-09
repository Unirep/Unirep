import * as path from 'path'
import { expect } from "chai"
import { genRandomSalt, IncrementalQuinTree, hashOne, SnarkBigInt, } from "@unirep/crypto"
import { executeCircuit, getSignalByName, } from "../circuits/utils"
import { compileAndLoadCircuit } from './utils'

const LEVELS = 4
const ZERO_VALUE = 0
const LeafExistsCircuitPath = path.join(__dirname, '../circuits/test/merkleTreeLeafExists_test.circom')
const InclusionProofCircuitPath = path.join(__dirname, '../circuits/test/merkleTreeInclusionProof_test.circom')

describe('Merkle Tree circuits', function () {
    this.timeout(30000)
    describe('LeafExists', () => {
        let circuit

        before(async () => {
            circuit = await compileAndLoadCircuit(LeafExistsCircuitPath)
        })

        it('Valid LeafExists inputs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2)
            const leaves: SnarkBigInt[] = []

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                tree.insert(hashOne(randomVal))
                leaves.push(hashOne(randomVal))
            }

            const root = tree.root

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const proof = tree.genMerklePath(i)
                const circuitInputs = {
                    leaf: leaves[i],
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                    root,
                }
                const witness = await executeCircuit(circuit, circuitInputs)
                const circuitRoot = getSignalByName(circuit, witness, 'main.root').toString()
                expect(circuitRoot).to.be.equal(root.toString())
            }
        })

        it('Invalid LeafExists inputs should not work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2)
            const leaves: SnarkBigInt[] = []

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
                leaves.push(hashOne(randomVal))
            }

            const root = tree.root

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const proof = tree.genMerklePath(i)
                const circuitInputs = {
                    leaf: leaves[i],
                    // The following are swapped to delibrately create an error
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                    root,
                }
                try {
                    await executeCircuit(circuit, circuitInputs)
                } catch {
                    expect(true).to.be.true
                }
            }
        })
    })

    describe('MerkleTreeInclusionProof', () => {
        let circuit

        before(async () => {
            circuit = await compileAndLoadCircuit(InclusionProofCircuitPath)
        })

        it('Valid update proofs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2)

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

                const proof = tree.genMerklePath(i)

                const root = tree.root

                const circuitInputs = {
                    leaf: leaf.toString(),
                    path_elements: proof.pathElements,
                    path_index: proof.indices
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                const circuitRoot = getSignalByName(circuit, witness, 'main.root').toString()
                expect(circuitRoot).to.equal(root.toString())
            }
        })

        it('Invalid update proofs should not work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2)

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

                const proof = tree.genMerklePath(i)

                // Delibrately create an invalid proof
                proof.pathElements[0][0] = BigInt(1)

                const isValid = IncrementalQuinTree.verifyMerklePath(
                    proof,
                    tree.hashFunc,
                )
                expect(isValid).to.be.false

                const circuitInputs = {
                    leaf: leaf.toString(),
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                const circuitRoot = getSignalByName(circuit, witness, 'main.root').toString()
                expect(circuitRoot).not.to.equal(tree.root.toString())
            }
        })
    })
})