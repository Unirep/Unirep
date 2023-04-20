// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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

    function insert(uint256 leaf) public {
        LazyMerkleTree.insert(data, leaf);
    }

    function root() public view returns (uint256) {
        return LazyMerkleTree.root(data, depth);
    }

    function insert0(uint256 leaf) public {
        ReusableMerkleTree.insert(data0, leaf);
    }

    function root0() public view returns (uint256) {
        return data0.root;
    }
}
