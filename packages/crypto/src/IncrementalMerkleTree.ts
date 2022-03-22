import { IncrementalMerkleTree as zkIncrementalMerkleTree } from '@zk-kit/incremental-merkle-tree'
import { poseidon } from 'circomlibjs'

export class IncrementalMerkleTree extends zkIncrementalMerkleTree {
    /**
     * Initializes the tree with the hash function, the depth, the zero value to use for zeroes
     * and the arity (i.e. the number of children for each node).
     * Fixed hash function: poseidon
     * @param depth Tree depth.
     * @param zeroValue Zero values for zeroes.
     * @param arity The number of children for each node.
     */
    constructor(depth: number, zeroValue: any, arity?: number) {
        super(poseidon, depth, zeroValue, arity)
    }
}
