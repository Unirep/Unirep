import chai from "chai"

const { expect } = chai

import {
    SnarkBigInt,
    genRandomSalt,
    hashLeftRight,
    bigInt,
} from 'maci-crypto'

import {
    compileAndLoadCircuit,
} from './utils'
import { BigNumber as smtBN } from "../../crypto/SMT"
import { bigIntToBuf, bufToBigInt, getNewSMT } from "../utils"

const circuitNullifierTreeDepth = 8

describe('Update nullifier tree circuits', function () {
    this.timeout(120000)

    let circuit
    
    const NUM_NULLIFIERS = 10
    let nullifierTree, intermediateNullifierTreeRoots, nullifierTreePathElements
    const ZERO_LEAF = bigIntToBuf(hashLeftRight(0, 0))
    const ONE_LEAF = bigIntToBuf(hashLeftRight(1, 0))

    let nullifiers: SnarkBigInt[] = [], selectors: number[] = []

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit('test/userNullifierTree_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        intermediateNullifierTreeRoots = []
        nullifierTree = await getNewSMT(circuitNullifierTreeDepth)
        // Reserve leaf 0
        let result 
        result = await nullifierTree.update(new smtBN(0), ONE_LEAF, true)
        expect(result).to.be.true
        intermediateNullifierTreeRoots.push(bufToBigInt(nullifierTree.getRootHash()))

        nullifierTreePathElements = []
        for (let i = 0; i < NUM_NULLIFIERS; i++) {
            let r = Math.floor(Math.random() * (2 ** circuitNullifierTreeDepth))
            while (nullifiers.indexOf(r) >= 0 || r == 0) r = Math.floor(Math.random() * (2 ** circuitNullifierTreeDepth))
            nullifiers.push(r)

            const sel = Math.floor(Math.random() * 2)
            selectors.push(sel)

            if ( sel == 1) {
                const nullifierTreeProof = await nullifierTree.getMerkleProof(new smtBN(nullifiers[i]), ZERO_LEAF, true)
                nullifierTreePathElements.push(nullifierTreeProof.siblings.map((p) => bufToBigInt(p)))

                let result 
                result = await nullifierTree.update(new smtBN(nullifiers[i]), ONE_LEAF, true)
                expect(result).to.be.true
            } else {
                const nullifierTreeProof = await nullifierTree.getMerkleProof(new smtBN(0), ONE_LEAF, true)
                nullifierTreePathElements.push(nullifierTreeProof.siblings.map((p) => bufToBigInt(p)))
            }

            intermediateNullifierTreeRoots.push(bufToBigInt(nullifierTree.getRootHash()))
        }
    })

    it('Valid nullifier tree update inputs should work', async () => {
        const circuitInputs = {
            intermediate_nullifier_tree_roots: intermediateNullifierTreeRoots,
            nullifiers: nullifiers,
            selectors: selectors,
            path_elements: nullifierTreePathElements,
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
    })

    it('Wrong intermediate nullifier tree root should not work', async () => {
        const wrongIntermediateNullifierTreeRoot = intermediateNullifierTreeRoots.slice()
        const indexWrongRoot = Math.floor(Math.random() * NUM_NULLIFIERS)
        wrongIntermediateNullifierTreeRoot[indexWrongRoot] = genRandomSalt()
        const circuitInputs = {
            intermediate_nullifier_tree_roots: wrongIntermediateNullifierTreeRoot,
            nullifiers: nullifiers,
            selectors: selectors,
            path_elements: nullifierTreePathElements,
        }

        const rootNotMatchRegExp = RegExp('.+ -> .+ != ' + intermediateNullifierTreeRoots[indexWrongRoot] + '$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(rootNotMatchRegExp)
    })

    it('Wrong nullifier should not work', async () => {
        const wrongNullifiers = nullifiers.slice()
        const indexWrongNullifier = selectors.indexOf(1)
        if (indexWrongNullifier >= 0) {
            let r = Math.floor(Math.random() * (2 ** circuitNullifierTreeDepth))
            while (nullifiers.indexOf(r) >= 0) r = Math.floor(Math.random() * (2 ** circuitNullifierTreeDepth))
            wrongNullifiers[indexWrongNullifier] = r
            const circuitInputs = {
                intermediate_nullifier_tree_roots: intermediateNullifierTreeRoots,
                nullifiers: wrongNullifiers,
                selectors: selectors,
                path_elements: nullifierTreePathElements,
            }
    
            const rootNotMatchRegExp = RegExp('.+ -> ' + intermediateNullifierTreeRoots[indexWrongNullifier + 1] + ' != .+$')
            expect(() => {
                circuit.calculateWitness(circuitInputs)
            }).to.throw(rootNotMatchRegExp)
        } else {
            console.log("All selectors are set to zero, skip wrong nullifier test")
        }
    })

    it('Wrong selector should not work', async () => {
        const wrongSelectors = selectors.slice()
        const indexWrongSelector = Math.floor(Math.random() * NUM_NULLIFIERS)
        wrongSelectors[indexWrongSelector] = wrongSelectors[indexWrongSelector] ? 0 : 1
        const circuitInputs = {
            intermediate_nullifier_tree_roots: intermediateNullifierTreeRoots,
            nullifiers: nullifiers,
            selectors: wrongSelectors,
            path_elements: nullifierTreePathElements,
        }

        const rootNotMatchRegExp = RegExp('.+ -> ' + intermediateNullifierTreeRoots[indexWrongSelector + 1] + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(rootNotMatchRegExp)
    })
})