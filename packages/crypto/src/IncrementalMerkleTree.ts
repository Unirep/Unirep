import {
    HashFunction,
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
    constructor(hash: HashFunction, depth: number, zeroValue: Node = 0, arity = 2) {
        super(hash, depth, zeroValue, arity)
    }
}
