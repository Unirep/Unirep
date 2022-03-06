import * as path from 'path'
import { expect } from "chai"
import { genRandomSalt, hashOne, SparseMerkleTreeImpl, } from "@unirep/crypto"
import { executeCircuit, getSignalByName, } from "../circuits/utils"
import { genNewSMT, compileAndLoadCircuit } from "./utils"
// circuitEpochTreeDepth too large will greatly slow down the test...
const circuitEpochTreeDepth = 8
const circuitPath = path.join(__dirname, '../circuits/test/smtLeafExists_test.circom')
const InclusionProofCircuitPath = path.join(__dirname, '../circuits/test/smtInclusionProof_test.circom')

describe('Sparse Merkle Tree circuits', function () {
    this.timeout(500000)

    describe('LeafExists', () => {
        let circuit

        let tree: SparseMerkleTreeImpl, leaves, root, ZERO_VALUE
        let leafIndicesToInsert: number[], emptyLeafIndices: number[]

        before(async () => {
            circuit = await compileAndLoadCircuit(circuitPath)

            const defaultLeafHash = hashOne(BigInt(0))
            tree = await genNewSMT(circuitEpochTreeDepth, defaultLeafHash)
            leaves = {}
            ZERO_VALUE = tree.getZeroHash(0)
        })

        it('Valid LeafExists inputs should work', async () => {
            const half = 2 ** (circuitEpochTreeDepth - 1)

            // Insert half of the leaves
            leafIndicesToInsert = []
            for (let i = 0; i < half; i++) {
                let ind = Math.floor(Math.random() * (2 ** circuitEpochTreeDepth))
                while (leafIndicesToInsert.indexOf(ind) >= 0) {
                    ind = Math.floor(Math.random() * (2 ** circuitEpochTreeDepth))
                }
                leafIndicesToInsert.push(ind)
            }
            for (let ind of leafIndicesToInsert) {
                const leaf = genRandomSalt()
                await tree.update(BigInt(ind), leaf)
                leaves[ind] = leaf
            }

            root = tree.getRootHash()

            // Prove first half of existent leaves
            for (let ind of leafIndicesToInsert) {
                const leaf = leaves[ind]
                const pathElements = await tree.getMerkleProof(BigInt(ind))
                const circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind,
                    path_elements: pathElements,
                    root,
                }
                const witness = await executeCircuit(circuit, circuitInputs)
            }

            // Prove second half of empty leaves
            emptyLeafIndices = []
            for (let i = 0; i < 2 ** circuitEpochTreeDepth; i++) {
                if (leafIndicesToInsert.indexOf(i) >= 0) continue
                else emptyLeafIndices.push(i)
            }
            for (let ind of emptyLeafIndices) {
                const pathElements = await tree.getMerkleProof(BigInt(ind))
                const circuitInputs = {
                    leaf: ZERO_VALUE,
                    leaf_index: ind,
                    path_elements: pathElements,
                    root,
                }
                const witness = await executeCircuit(circuit, circuitInputs)
            }
        })

        it('Invalid LeafExists inputs should not work', async () => {
            for (let ind of leafIndicesToInsert) {
                const leaf = leaves[ind]
                const pathElements = await tree.getMerkleProof(BigInt(ind))

                // Check against wrong leaf
                const randomVal = genRandomSalt()
                const wrongLeaf = genRandomSalt()
                let circuitInputs = {
                    leaf: wrongLeaf,
                    leaf_index: ind,
                    path_elements: pathElements,
                    root,
                }

                let error
                try {
                    await executeCircuit(circuit, circuitInputs)
                } catch (e) {
                    error = e
                    expect(true).to.be.true
                } finally {
                    if (!error) throw Error("Root mismatch results from wrong leaf should throw error")
                }

                // Check against wrong leaf index
                circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind < 15 ? (ind + 1) : (ind - 1),
                    path_elements: pathElements,
                    root,
                }

                error = undefined
                try {
                    await executeCircuit(circuit, circuitInputs)
                } catch (e) {
                    error = e
                    expect(true).to.be.true
                } finally {
                    if (!error) throw Error("Root mismatch results from wrong leaf should throw error")
                }

                // Check against wrong path elements
                const otherIndex = emptyLeafIndices[0]
                const wrongPathElements = await tree.getMerkleProof(BigInt(otherIndex))
                circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind,
                    path_elements: wrongPathElements,
                    root,
                }

                error = undefined
                try {
                    await executeCircuit(circuit, circuitInputs)
                } catch (e) {
                    error = e
                    expect(true).to.be.true
                } finally {
                    if (!error) throw Error("Root mismatch results from wrong path elements should throw error")
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
            const defaultLeafHash = hashOne(BigInt(0))
            const tree = await genNewSMT(circuitEpochTreeDepth, defaultLeafHash)
            const leaves = {}

            // Populate the tree
            for (let ind = 0; ind < 2 ** circuitEpochTreeDepth; ind++) {
                const leaf = genRandomSalt()
                await tree.update(BigInt(ind), leaf)
                leaves[ind] = leaf
            }

            // Update the tree and verify inclusion proof
            for (let ind = 0; ind < 2 ** circuitEpochTreeDepth; ind++) {
                const leaf = genRandomSalt()
                await tree.update(BigInt(ind), leaf)
                leaves[ind] = leaf

                const pathElements = await tree.getMerkleProof(BigInt(ind))

                const root = tree.getRootHash()

                const circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind,
                    path_elements: pathElements,
                }

                const witness = await executeCircuit(circuit, circuitInputs)

                const circuitRoot = getSignalByName(circuit, witness, 'main.root').toString()
                expect(circuitRoot).equal(root.toString())
            }
        })
    })
})