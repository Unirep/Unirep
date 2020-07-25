pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


contract OneTimeSparseMerkleTree {
    /* Fields */
    // The address of the default hash storage.
    mapping(uint256 => bytes32) defaultHashStorage;

    // The tree depth
    uint256 public treeLevels;
    uint256 public numLeaves;

    mapping(uint256 => bytes32) public nodes;

    /**
     * @notice Initialize a new SparseMerkleUtils contract, computing the default hashes for the sparse merkle tree (SMT) and saving them
     * as a contract.
     */
    constructor(uint256 _treeLevels) public {
        treeLevels = _treeLevels;
        numLeaves = 2 ** _treeLevels;
    }

    /* Methods */
    function getDefaultHashes()
    public view returns(bytes32[] memory) {
        bytes32[] memory defaultHashes = new bytes32[](treeLevels);
        defaultHashes[0] = keccak256(abi.encodePacked(uint256(0)));
        for (uint256 i = 1; i < treeLevels; i ++) {
            defaultHashes[i] = keccak256(abi.encodePacked(defaultHashes[i-1], defaultHashes[i-1]));
        }
        return defaultHashes;
    }

    /**
     * @notice Get the sparse merkle root computed from some set of data blocks.
     * @param _leafData The data being used to generate the tree.
     */
    function genSMT(uint256[] calldata _leafIndices, bytes32[] calldata _leafData) external {
        require(_leafIndices.length <= numLeaves, "Can not insert more than total number of leaves");
        require(_leafIndices.length == _leafData.length, "Indices and data not of the same length");

        uint256[] memory nextLevelIndices;
        // uint256[] memory currentLevelIndices = new uint256[](_leafIndices.length);
        uint256[] memory currentLevelIndices = _leafIndices;
        uint currentDefaultHashesLevel = 0;
        bytes32[] memory defaultHashes = getDefaultHashes();

        uint256 nodeIndex;
        // Write leaves into storage
        for (uint i = 0; i < currentLevelIndices.length; i++) {
            // Leaf index starts with 0 which is equivalent to node index 0 + numLeaves
            currentLevelIndices[i] = currentLevelIndices[i] + numLeaves;
            nodeIndex = currentLevelIndices[i];
            nodes[nodeIndex] = _leafData[i];
        }

        uint256 nextInsertIndex;
        uint256 parentNodeIndex;
        bool isLeftChildeNode;
        bytes32 theNode;
        bytes32 siblingNode;
        for (uint i = 0; i < treeLevels; i++) {
            nextLevelIndices = new uint256[](currentLevelIndices.length);
            nextInsertIndex = 0;
            // Calculate the nodes for the currentDefaultHashesLevel
            for (uint j = 0; j < currentLevelIndices.length; j++) {
                nodeIndex = currentLevelIndices[j];
                parentNodeIndex = nodeIndex / 2;

                // Parent node is already generated during processing previous node, i.e., the sibling node
                if(nodes[parentNodeIndex] != 0) continue;

                // Insert parent node index into next level indices list
                nextLevelIndices[nextInsertIndex] = parentNodeIndex;
                nextInsertIndex ++;

                theNode = nodes[nodeIndex];
                // isLeftChildeNode = (nodeIndex & 1 == 0)? true : false;
                isLeftChildeNode = (nodeIndex % 2 == 0)? true : false;
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
            require(nextInsertIndex > 0, "Should insert at least one node index into next level indices list");
            currentLevelIndices = new uint256[](nextInsertIndex);
            for (uint k = 0; k < nextInsertIndex; k++) {
                currentLevelIndices[k] = nextLevelIndices[k];
            }
            currentDefaultHashesLevel ++;
        }
    }

    /**
     * @notice Get our stored tree's root
     * @return The merkle root of the tree
     */
    function getRoot() public view returns(bytes32) {
        return nodes[1];
    }
}