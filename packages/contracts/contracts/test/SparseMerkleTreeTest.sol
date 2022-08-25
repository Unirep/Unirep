// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SparseMerkleTree, SparseTreeData} from '../SparseMerkleTree.sol';
import {Poseidon2} from '../Hash.sol';

contract SparseMerkleTreeTest {
    SparseTreeData public smt;

    constructor(uint256 depth, uint256 zero) {
        SparseMerkleTree.init(smt, depth, zero);
    }

    function root() public view returns (uint256) {
        return smt.root;
    }

    function update(uint256 index, uint256 leaf) public {
        SparseMerkleTree.update(smt, index, leaf);
    }

    function compute(uint256 index, uint256 leaf)
        public
        view
        returns (uint256)
    {
        return SparseMerkleTree.computeRoot(smt, index, leaf);
    }
}
