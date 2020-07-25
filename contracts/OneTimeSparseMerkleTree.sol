pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


contract OneTimeSparseMerkleTree {
   // The tree depth
    uint256 public treeLevels;
    uint256 public numLeaves;

    mapping(uint256 => bytes32) public nodes;

    constructor(uint256 _treeLevels) public {
        require(_treeLevels > 0, "Tree level(depth) should be at least one, i.e., have at least two leaf nodes");
        treeLevels = _treeLevels;
        numLeaves = 2 ** _treeLevels;
    }

    function getDefaultHashes()
    public view returns(bytes32[] memory) {
        bytes32[] memory defaultHashes = new bytes32[](treeLevels);
        defaultHashes[0] = keccak256(abi.encodePacked(uint256(0)));
        for (uint256 i = 1; i < treeLevels; i ++) {
            defaultHashes[i] = keccak256(abi.encodePacked(defaultHashes[i-1], defaultHashes[i-1]));
        }
        return defaultHashes;
    }

    function genSMT(uint256[] calldata _leafIndices, bytes32[] calldata _leafData) external {
        require(_leafIndices.length <= numLeaves, "Can not insert more than total number of leaves");
        require(_leafIndices.length == _leafData.length, "Indices and data not of the same length");

        uint256[] memory parentLayerIndices;
        uint256[] memory currentLayerIndices = _leafIndices;  // Starts from the bottom layer
        uint currentDefaultHashesLevel = 0;
        bytes32[] memory defaultHashes = getDefaultHashes();

        uint256 nodeIndex;
        // Write leaves into storage
        for (uint i = 0; i < currentLayerIndices.length; i++) {
            // First we convert the passed in leaf indices into node indices.
            // Leaf index starts with 0 which is equivalent to node index of (0 + numLeaves)
            currentLayerIndices[i] = currentLayerIndices[i] + numLeaves;
            nodeIndex = currentLayerIndices[i];
            nodes[nodeIndex] = _leafData[i];
        }

        uint256 nextInsertIndex;
        uint256 parentNodeIndex;
        bool isLeftChildeNode;
        bytes32 theNode;
        bytes32 siblingNode;
        for (uint i = 0; i < treeLevels; i++) {
            parentLayerIndices = new uint256[](currentLayerIndices.length);
            nextInsertIndex = 0;
            // Compute parent nodes for the nodes in current layer
            for (uint j = 0; j < currentLayerIndices.length; j++) {
                nodeIndex = currentLayerIndices[j];
                parentNodeIndex = nodeIndex / 2;

                // Parent node is already generated during processing previous node, i.e., the sibling node,
                // so we skip this node.
                if(nodes[parentNodeIndex] != 0) continue;

                // Insert parent node index into parent layer indices list
                parentLayerIndices[nextInsertIndex] = parentNodeIndex;
                nextInsertIndex ++;

                theNode = nodes[nodeIndex];
                isLeftChildeNode = (nodeIndex & 1 == 0)? true : false;
                if(isLeftChildeNode) {
                    siblingNode = nodes[nodeIndex + 1];
                    if(siblingNode == 0) {
                        siblingNode = defaultHashes[currentDefaultHashesLevel];
                    }
                    nodes[parentNodeIndex] = keccak256(abi.encodePacked(theNode, siblingNode));
                } else {
                    siblingNode = nodes[nodeIndex - 1];
                    if(siblingNode == 0) {
                        siblingNode = defaultHashes[currentDefaultHashesLevel];
                    }
                    nodes[parentNodeIndex] = keccak256(abi.encodePacked(siblingNode, theNode));
                }
            }
            require(nextInsertIndex > 0, "Should insert at least one node index into parent layer indices list");

            // Copy parent layer indices to current layer indices
            currentLayerIndices = new uint256[](nextInsertIndex);
            for (uint k = 0; k < nextInsertIndex; k++) {
                currentLayerIndices[k] = parentLayerIndices[k];
            }

            currentDefaultHashesLevel ++;
        }
    }

    function getRoot() public view returns(bytes32) {
        return nodes[1];
    }
}