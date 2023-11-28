// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LazyMerkleTree, LazyTreeData} from '../libraries/LazyMerkleTree.sol';
import {ReusableMerkleTree, ReusableTreeData} from '../libraries/ReusableMerkleTree.sol';

import 'hardhat/console.sol';

contract MerkleTreeTest {
    LazyTreeData data;
    ReusableTreeData data0;
    uint8 depth;

    constructor(uint8 _depth) {
        depth = _depth;
        LazyMerkleTree.init(data, uint8(_depth));
        ReusableMerkleTree.init(data0, _depth);
    }

    function insertLazy(uint256 leaf) public {
        LazyMerkleTree.insert(data, leaf);
    }

    function rootLazy() public view returns (uint256) {
        return LazyMerkleTree.root(data, depth);
    }

    function updateLazy(uint256 leaf, uint40 index) public {
        LazyMerkleTree.update(data, leaf, index);
    }

    function insertReusable(uint256 leaf) public {
        ReusableMerkleTree.insert(data0, leaf);
    }

    function rootReusable() public view returns (uint256) {
        return data0.root;
    }

    function updateReusable(uint256 leaf, uint256 index) public {
        ReusableMerkleTree.update(data0, leaf, index);
    }
}
