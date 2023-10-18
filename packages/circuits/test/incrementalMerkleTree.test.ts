import { expect } from 'chai'
import { IncrementalMerkleTree } from '@unirep/utils'
import { genProofAndVerify } from './utils'
import { CircuitConfig } from '../src'

const { STATE_TREE_DEPTH } = CircuitConfig.default

const random = () => Math.floor(Math.random() * 1000000000)

describe('Incremental Merkle Tree', function () {
    this.timeout(30000)
    it('should generate correct root', async () => {
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const index = 50
        const leaves = [] as any
        for (let x = 0; x < 100; x++) {
            const leaf = random()
            leaves.push(leaf)
            tree.insert(leaf)
        }

        const treeProof = tree.createProof(index)
        const { isValid, publicSignals } = await genProofAndVerify(
            'incrementalMerkleTree' as any,
            {
                leaf: leaves[index],
                path_index: treeProof.pathIndices,
                path_elements: treeProof.siblings,
            }
        )
        expect(isValid).to.be.true
        expect(publicSignals[0].toString()).to.equal(tree.root.toString())
    })

    it('should generate incorrect root', async () => {
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const index = 50
        const leaves = [] as any
        for (let x = 0; x < 100; x++) {
            const leaf = random()
            leaves.push(leaf)
            tree.insert(leaf)
        }

        const treeProof = tree.createProof(index)
        const { isValid, publicSignals } = await genProofAndVerify(
            'incrementalMerkleTree' as any,
            {
                leaf: leaves[index] + 1,
                path_index: treeProof.pathIndices,
                path_elements: treeProof.siblings,
            }
        )
        expect(isValid).to.be.true
        expect(publicSignals[0].toString()).to.not.equal(tree.root.toString())
    })

    it('should fail to prove 0 element', async () => {
        const circuitInputs = {
            leaf: 1,
            path_index: Array(STATE_TREE_DEPTH).fill(0),
            path_elements: Array(STATE_TREE_DEPTH).fill(0),
        }
        const { isValid } = await genProofAndVerify(
            'incrementalMerkleTree' as any,
            circuitInputs
        )
        expect(isValid).to.be.true

        await new Promise<void>((rs, rj) => {
            genProofAndVerify('incrementalMerkleTree' as any, {
                ...circuitInputs,
                leaf: 0,
            })
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
