"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncrementalMerkleTree = void 0;
const incremental_merkle_tree_1 = require("@zk-kit/incremental-merkle-tree");
const circomlibjs_1 = require("circomlibjs");
class IncrementalMerkleTree extends incremental_merkle_tree_1.IncrementalMerkleTree {
    /**
     * Initializes the tree with the hash function, the depth, the zero value to use for zeroes
     * and the arity (i.e. the number of children for each node).
     * Fixed hash function: poseidon
     * @param depth Tree depth.
     * @param zeroValue Zero values for zeroes.
     * @param arity The number of children for each node.
     */
    constructor(depth, zeroValue, arity) {
        super(circomlibjs_1.poseidon, depth, zeroValue, arity);
    }
}
exports.IncrementalMerkleTree = IncrementalMerkleTree;
