// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SparseMerkleTree, SparseTreeData} from '../SparseMerkleTree.sol';
import {Poseidon2} from '../Hash.sol';

contract SparseMerkleTreeTest {
    SparseTreeData public smt;

    constructor(uint256 depth) {
        SparseMerkleTree.init(smt, depth, 0);
    }

    function root() public view returns (uint256) {
        return smt.root;
    }

    function update(uint256 index, uint256 leaf) public {
        SparseMerkleTree.update(smt, index, leaf);
    }
}
