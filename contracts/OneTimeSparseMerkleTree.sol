pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Hasher } from "./Hasher.sol";

contract OneTimeSparseMerkleTree is Hasher {
   // The tree depth
    uint256 public treeLevels;
    uint256 public numLeaves;

    struct LeavesToInsert {
        uint256 numLeavesToInsert;
        uint256[] leafIndices;
        uint256[] leafData;
    }
    LeavesToInsert leavesToInsert;

    // Grouped local variables to bypass compiler "stack too deep" error
    struct TreeNodes {
        uint256 nodeIndex;
        uint256 theNode;
        uint256 parentNodeIndex;
        uint256 siblingNode;
        bool find;
        bool isLeftChildeNode;
        uint256 nextInsertIndex;
    }

    constructor(uint256 _treeLevels, uint256[] memory _leafIndices, uint256[] memory _leafData) public {
        require(_treeLevels > 0, "Tree level(depth) should be at least one, i.e., have at least two leaf nodes");
        treeLevels = _treeLevels;
        uint256 _numLeaves = 2 ** _treeLevels;
        numLeaves = _numLeaves;

        require(_leafIndices.length <= _numLeaves, "Can not insert more than total number of leaves");
        require(_leafIndices.length == _leafData.length, "Indices and data not of the same length");
        leavesToInsert.numLeavesToInsert = _leafIndices.length;
        leavesToInsert.leafIndices = new uint256[](_leafIndices.length);
        leavesToInsert.leafData = new uint256[](_leafData.length);
        for (uint256 i = 0; i < _leafIndices.length; i ++) {
            require(_leafIndices[i] <= _numLeaves, "Index of inserted leaf is greater than total number of leaves");
            leavesToInsert.leafIndices[i] = _leafIndices[i];
            leavesToInsert.leafData[i] = _leafData[i];
        }
    }

    function getDefaultHashes()
    public view returns (uint256[] memory) {
        uint256[] memory defaultHashes = new uint256[](treeLevels);
        defaultHashes[0] = hashLeftRight(uint256(0), uint256(0));
        for (uint256 i = 1; i < treeLevels; i ++) {
            defaultHashes[i] = hashLeftRight(defaultHashes[i-1], defaultHashes[i-1]);
        }
        return defaultHashes;
    }

    function getLeavesToInsert() public view returns (uint256[] memory, uint256[] memory) {
        uint256 numLeavesToInsert = leavesToInsert.numLeavesToInsert;
        uint256[] memory _leafIndices = new uint256[](numLeavesToInsert);
        uint256[] memory _leafData = new uint256[](numLeavesToInsert);
        for (uint256 i = 0; i < numLeavesToInsert; i ++) {
            _leafIndices[i] = leavesToInsert.leafIndices[i];
            _leafData[i] = leavesToInsert.leafData[i];
        }
        return (_leafIndices, _leafData);
    }


    function isInList(uint256 target, uint256[] memory list) internal pure returns (bool) {
        for (uint i = 0; i < list.length; i++) {
            if(target != list[i]) continue;
            else return true;
        }
        return false;
    }

    function getDataInList(uint256 index, uint256[] memory indicesList, uint256[] memory dataList) internal pure returns (bool, uint256) {
        require(indicesList.length == dataList.length, "Indices and data not of the same length");

        for (uint i = 0; i < indicesList.length; i++) {
            if(index != indicesList[i]) continue;
            else return (true, dataList[i]);
        }
        return (false, uint256(0));
    }

    function genSMT() external view returns (uint256) {
        uint256 _numLeaves = numLeaves;
        uint256 _treeLevels = treeLevels;
        uint256 _numLeavesToInsert = leavesToInsert.numLeavesToInsert;

        uint256[] memory parentLayerIndices;
        uint256[] memory parentLayerData;
        // We start processing from the bottom layer
        uint256[] memory currentLayerIndices = new uint256[](_numLeavesToInsert);
        uint256[] memory currentLayerData = new uint256[](_numLeavesToInsert);
        uint256[] memory defaultHashes = getDefaultHashes();
        uint currentDefaultHashesLevel = 0;

        TreeNodes memory vars;

        // Check validity of inputs and convert leaf index into node index
        for (uint i = 0; i < _numLeavesToInsert; i++) {

            // // If we require input indices to be strictly increasing
            // // Check that indices are strictly increasing
            // if(i > 0) require(leavesToInsert.leafIndices[i] > leavesToInsert.leafIndices[i-1], "Indices in list are not sorted (should increase strictly)");

            // Leaf index starts with 0 which is equivalent to node index of (0 + numLeaves)
            currentLayerIndices[i] = leavesToInsert.leafIndices[i] + _numLeaves;
            currentLayerData[i] = leavesToInsert.leafData[i];
        }

        for (uint i = 0; i < _treeLevels; i++) {
            parentLayerIndices = new uint256[](currentLayerIndices.length);
            parentLayerData = new uint256[](currentLayerData.length);
            vars.nextInsertIndex = 0;
            // Compute parent nodes of the nodes in current layer
            for (uint j = 0; j < currentLayerIndices.length; j++) {
                vars.nodeIndex = currentLayerIndices[j];
                vars.parentNodeIndex = vars.nodeIndex / 2;

                // If parent node is already generated during processing previous node, i.e., the sibling node,
                // then we skip this node.
                if(isInList(vars.parentNodeIndex, parentLayerIndices)) continue;

                // Insert parent node index into parent layer indices list
                parentLayerIndices[vars.nextInsertIndex] = vars.parentNodeIndex;

                vars.theNode = currentLayerData[j];
                vars.isLeftChildeNode = (vars.nodeIndex & 1 == 0)? true : false;
                if(vars.isLeftChildeNode) {
                    // If we require input indices to be strictly increasing, then we can assume sibling node to be in either (j+1) or (j-1).
                    // if(j < (currentLayerIndices.length - 1)) {
                    //     vars.siblingNode = (currentLayerIndices[j+1] == vars.nodeIndex + 1) ? currentLayerData[j+1] : defaultHashes[currentDefaultHashesLevel];
                    // } else {
                    //     vars.siblingNode = defaultHashes[currentDefaultHashesLevel];
                    // }

                    (vars.find, vars.siblingNode) = getDataInList(vars.nodeIndex + 1, currentLayerIndices, currentLayerData);
                    if(vars.find == false) {
                        vars.siblingNode = defaultHashes[currentDefaultHashesLevel];
                    }
                    parentLayerData[vars.nextInsertIndex] = hashLeftRight(vars.theNode, vars.siblingNode);
                } else {
                    // If we require input indices to be strictly increasing, then we can assume sibling node to be in either (j+1) or (j-1).
                    // if(j > 0) {
                    //     vars.siblingNode = (currentLayerIndices[j-1] == vars.nodeIndex - 1) ? currentLayerData[j-1] : defaultHashes[currentDefaultHashesLevel];
                    // } else {
                    //     vars.siblingNode = defaultHashes[currentDefaultHashesLevel];
                    // }

                    (vars.find, vars.siblingNode) = getDataInList(vars.nodeIndex - 1, currentLayerIndices, currentLayerData);
                    if(vars.find == false) {
                        vars.siblingNode = defaultHashes[currentDefaultHashesLevel];
                    }
                    parentLayerData[vars.nextInsertIndex] = hashLeftRight(vars.siblingNode, vars.theNode);
                }

                vars.nextInsertIndex ++;
            }
            require(vars.nextInsertIndex > 0, "Should insert at least one node index into parent layer indices list");

            // Copy parent layer indices/data to current layer indices/data
            currentLayerIndices = new uint256[](vars.nextInsertIndex);
            currentLayerData = new uint256[](vars.nextInsertIndex);
            for (uint j = 0; j < vars.nextInsertIndex; j++) {
                currentLayerIndices[j] = parentLayerIndices[j];
                currentLayerData[j] = parentLayerData[j];
            }

            currentDefaultHashesLevel ++;
        }

        // After final step processing, current layer would be one layer below top layer
        // and parent layer would be the top layer.
        // So parent layer should have only one node.
        require(vars.nextInsertIndex == 1, "Can not have more than one root");
        return parentLayerData[0];
    }
}