import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'

import {
    genRandomSalt,
    hashOne,
} from 'maci-crypto'
import { BigNumber as smtBN } from "../../crypto/SMT"
import { getNewSMT, bigIntToBuf, bufToBigInt } from "../utils"
import { circuitEpochTreeDepth } from "../../config/testLocal"

describe('Sparse Merkle Tree circuits', () => {

    describe('LeafExists', () => {
        let circuit

        let tree, leaves, root, ZERO_VALUE
        let leafIndicesToInsert: number[], emptyLeafIndices: number[]

        before(async () => {
            circuit = await compileAndLoadCircuit('test/smtLeafExists_test.circom')

            tree = await getNewSMT(circuitEpochTreeDepth)
            leaves = {}
            ZERO_VALUE = bufToBigInt(tree.getZeroHash(circuitEpochTreeDepth))
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
                const randomVal = Math.floor(Math.random() * 1000)
                const leaf = hashOne(randomVal)
                const leafToBuf = bigIntToBuf(leaf)
                let result 
                result = await tree.update(new smtBN(ind), leafToBuf, true)
                expect(result).to.be.true
                leaves[ind] = leaf
            }

            root = bufToBigInt(tree.getRootHash())

            // Prove first half of existent leaves
            for (let ind of leafIndicesToInsert) {
                const leaf = leaves[ind]
                const proof = await tree.getMerkleProof(new smtBN(ind), bigIntToBuf(leaf), true)
                const pathElements = proof.siblings.map((p) => bufToBigInt(p))
                const circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind,
                    path_elements: pathElements,
                    root,
                }
                const witness = circuit.calculateWitness(circuitInputs)
                expect(circuit.checkWitness(witness)).to.be.true
            }

            // Prove second half of empty leaves
            emptyLeafIndices = []
            for (let i = 0; i < 2 ** circuitEpochTreeDepth; i++) {
                if (leafIndicesToInsert.indexOf(i) >= 0) continue
                else emptyLeafIndices.push(i)
            }
            for (let ind of emptyLeafIndices) {
                const proof = await tree.getMerkleProof(new smtBN(ind), ZERO_VALUE, true)
                const pathElements = proof.siblings.map((p) => bufToBigInt(p))
                const circuitInputs = {
                    leaf: ZERO_VALUE,
                    leaf_index: ind,
                    path_elements: pathElements,
                    root,
                }
                const witness = circuit.calculateWitness(circuitInputs)
                expect(circuit.checkWitness(witness)).to.be.true
            }
        })

        it('Invalid LeafExists inputs should not work', async () => {
            for (let ind of leafIndicesToInsert) {
                const leaf = leaves[ind]
                const proof = await tree.getMerkleProof(new smtBN(ind), bigIntToBuf(leaf), true)
                const pathElements = proof.siblings.map((p) => bufToBigInt(p))

                // Check against wrong leaf
                const randomVal = Math.floor(Math.random() * 1000)
                const wrongLeaf = hashOne(randomVal)
                let circuitInputs = {
                    leaf: wrongLeaf,
                    leaf_index: ind,
                    path_elements: pathElements,
                    root,
                }

                const rootNotMatchRegExp = RegExp('.+ -> ' + root + ' !=.+$')
                expect(() => {
                    circuit.calculateWitness(circuitInputs)
                }).to.throw(rootNotMatchRegExp, "Root mismatch results from wrong leaf should not pass check")

                // Check against wrong leaf index
                circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind < 15 ? (ind + 1) : (ind - 1),
                    path_elements: pathElements,
                    root,
                }

                expect(() => {
                    circuit.calculateWitness(circuitInputs)
                }).to.throw(rootNotMatchRegExp, "Root mismatch results from wrong leaf index should not pass check")

                // Check against wrong path elements
                const otherIndex = emptyLeafIndices[0]
                const wrongProof = await tree.getMerkleProof(new smtBN(otherIndex), ZERO_VALUE, true)
                const wrongPathElements = wrongProof.siblings.map((p) => bufToBigInt(p))
                circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind,
                    path_elements: wrongPathElements,
                    root,
                }

                expect(() => {
                    circuit.calculateWitness(circuitInputs)
                }).to.throw(rootNotMatchRegExp, "Root mismatch results from wrong path elements should not pass check")
            }
        })
    })

    describe('MerkleTreeInclusionProof', () => {
        let circuit

        before(async () => {
            circuit = await compileAndLoadCircuit('test/smtInclusionProof_test.circom')
        })

        it('Valid update proofs should work', async () => {
            const tree = await getNewSMT(circuitEpochTreeDepth)
            const leaves = {}

            // Populate the tree
            for (let ind = 0; ind < 2 ** circuitEpochTreeDepth; ind++) {
                const randomVal = Math.floor(Math.random() * 1000)
                const leaf = hashOne(randomVal)
                const leafToBuf = bigIntToBuf(leaf)
                let result 
                result = await tree.update(new smtBN(ind), leafToBuf, true)
                expect(result).to.be.true
                leaves[ind] = leaf
            }

            for (let ind = 0; ind < 2 ** circuitEpochTreeDepth; ind++) {
                const randomVal = genRandomSalt()
                const leaf = hashOne(randomVal)
                const leafToBuf = bigIntToBuf(leaf)
                let result 
                result = await tree.update(new smtBN(ind), leafToBuf, true)
                expect(result).to.be.true
                leaves[ind] = leaf

                const proof = await tree.getMerkleProof(new smtBN(ind), bigIntToBuf(leaf), true)
                const pathElements = proof.siblings.map((p) => bufToBigInt(p))

                const root = bufToBigInt(tree.getRootHash())

                const circuitInputs = {
                    leaf: leaf,
                    leaf_index: ind,
                    path_elements: pathElements,
                }

                const witness = circuit.calculateWitness(circuitInputs)
                expect(circuit.checkWitness(witness)).to.be.true

                expect(witness[circuit.getSignalIdx('main.root')].toString())
                    .equal(root.toString())
            }
        })
    })
})