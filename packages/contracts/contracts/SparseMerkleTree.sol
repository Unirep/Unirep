// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Poseidon2} from './Hash.sol';

struct SparseTreeData {
    uint256 depth;
    uint256 root;
    // depth to zero node
    mapping(uint256 => uint256) zeroes;
    // depth to index to leaf
    mapping(uint256 => mapping(uint256 => uint256)) leaves;
}

library SparseMerkleTree {
    uint8 internal constant MAX_DEPTH = 32;
    uint256 internal constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    function init(
        SparseTreeData storage self,
        uint256 depth,
        uint256 _zero
    ) public {
        require(_zero < SNARK_SCALAR_FIELD);
        require(depth > 0 && depth <= MAX_DEPTH);

        uint256 zero = _zero;

        self.depth = depth;

        for (uint8 i = 0; i < depth; ) {
            self.zeroes[i] = zero;
            zero = Poseidon2.poseidon([zero, zero]);

            unchecked {
                i++;
            }
        }
        self.root = Poseidon2.poseidon([zero, zero]);
    }

    function update(
        SparseTreeData storage self,
        uint256 index,
        uint256 leaf
    ) public {
        uint256 depth = self.depth;
        require(leaf < SNARK_SCALAR_FIELD);
        require(index < 2**depth);

        uint256 hash = leaf;
        uint256 lastLeftElement;
        uint256 lastRightElement;

        for (uint8 i = 0; i < depth; ) {
            self.leaves[i][index] = hash;
            if (index % 2 == 0) {
                uint256 siblingLeaf = self.leaves[i][index + 1];
                if (siblingLeaf == 0) siblingLeaf = self.zeroes[i];
                lastLeftElement = hash;
                lastRightElement = siblingLeaf;
            } else {
                uint256 siblingLeaf = self.leaves[i][index - 1];
                if (siblingLeaf == 0) siblingLeaf = self.zeroes[i];
                lastLeftElement = siblingLeaf;
                lastRightElement = hash;
            }

            hash = Poseidon2.poseidon([lastLeftElement, lastRightElement]);
            index >>= 1;

            unchecked {
                i++;
            }
        }

        self.root = hash;
    }
}
