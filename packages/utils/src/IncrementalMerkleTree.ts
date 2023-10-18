import { poseidon2 } from 'poseidon-lite'
import {
    IncrementalMerkleTree as zkIncrementalMerkleTree,
    Node,
} from '@zk-kit/incremental-merkle-tree'

/**
 * The modified IncrementalMerkleTree which is used in Unirep protocol to generate global state tree. It inherited from `IncrementalMerkleTree` from [`@zk-kit/incremental-merkle-tree`](https://zkkit.pse.dev/modules/_zk_kit_incremental_merkle_tree.html)
 * @example
 * ```ts
 * import { IncrementalMerkleTree } from '@unirep/utils'
 *
 * const tree = new IncrementalMerkleTree(32)
 * ```
 */
export class IncrementalMerkleTree extends zkIncrementalMerkleTree {
    /**
     * Initializes the tree with the hash function, the depth, the zero value to use for zeroes
     * and the arity (i.e. the number of children for each node).
     * Fixed hash function: poseidon
     * @param depth Tree depth.
     * @param zeroValue Zero values for zeroes (default: `0`).
     * @param arity The number of children for each node (default: `2`).
     */
    constructor(depth: number, zeroValue: Node = 0, arity: number = 2) {
        super(poseidon2, depth, zeroValue, arity)
    }
}

export { Node }
