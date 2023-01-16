import poseidon from 'poseidon-lite'
import {
    IncrementalMerkleTree as zkIncrementalMerkleTree,
    Node,
} from '@zk-kit/incremental-merkle-tree'

/**
 * The modified IncrementalMerkleTree which is used in Unirep protocol to generate global state tree. It inherited from `IncrementalMerkleTree` from `@zk-kit/incremental-merkle-tree`
 */
export class IncrementalMerkleTree extends zkIncrementalMerkleTree {
    /**
     * Initializes the tree with the hash function, the depth, the zero value to use for zeroes
     * and the arity (i.e. the number of children for each node).
     * Fixed hash function: poseidon
     * @param depth Tree depth.
     * @param zeroValue Zero values for zeroes.
     * @param arity The number of children for each node.
     */
    constructor(depth: number, zeroValue: Node = 0, arity: number = 2) {
        super(poseidon, depth, zeroValue, arity)
    }

    //~~ WIP function that returns all leaves for level
    //~~ zk-kit excludes the index being proven
    _createProof(index: number) {
        if (index < 0 || index >= (this as any)._nodes[0].length) {
            throw new Error('The leaf does not exist in this tree')
        }

        const siblings: any[][] = []
        const pathIndices: number[] = []
        const leafIndex = index

        for (let level = 0; level < (this as any)._depth; level += 1) {
            const position = index % (this as any)._arity
            const levelStartIndex = index - position
            const levelEndIndex = levelStartIndex + (this as any)._arity

            pathIndices[level] = position
            siblings[level] = []

            for (let i = levelStartIndex; i < levelEndIndex; i += 1) {
                if (i < (this as any)._nodes[level].length) {
                    siblings[level].push((this as any)._nodes[level][i])
                } else {
                    siblings[level].push((this as any)._zeroes[level])
                }
            }

            index = Math.floor(index / (this as any)._arity)
        }

        return {
            root: (this as any)._root,
            leaf: (this as any)._nodes[0][leafIndex],
            pathIndices,
            siblings,
        }
    }
}

export { Node }
