pragma experimental ABIEncoderV2;
pragma solidity ^0.5.0;

import { DomainObjs } from './DomainObjs.sol';
import { IncrementalMerkleTree } from "./IncrementalMerkleTree.sol";
import { SnarkConstants } from './SnarkConstants.sol';
import { ComputeRoot } from './ComputeRoot.sol';
import { UnirepParameters } from './UnirepParameters.sol';
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

contract Unirep is Ownable, DomainObjs, ComputeRoot, UnirepParameters {

    // A nothing-up-my-sleeve zero value
    // Should be equal to 16916383162496104613127564537688207714240750091683495371401923915264313510848
    uint256 ZERO_VALUE = uint256(keccak256(abi.encodePacked('Unirep'))) % SNARK_SCALAR_FIELD;

    uint256 public currentEpoch = 0;

    // The tree that tracks each user's public key and votes
    IncrementalMerkleTree public stateTree;

    // To store the Merkle root of a tree with 2 **
    // treeDepths.userStateTreeDepth leaves of value 0
    uint256 public emptyUserStateRoot;

    // The maximum number of signups allowed
    uint256 public maxUsers;

    uint256 public numUserSignUps = 0;

    mapping(uint256 => bool) public hasUserSignedUp;

    TreeDepths public treeDepths;

    // Events
    event UserSignUp(
        uint256 indexed _epoch,
        uint256 indexed _identityCommitment,
        uint256 _hashedLeaf
    );

    constructor(
        TreeDepths memory _treeDepths,
        MaxValues memory _maxValues
    ) Ownable() public {

        treeDepths = _treeDepths;

        // Check and store the maximum number of signups
        // It is the user's responsibility to ensure that the state tree depth
        // is just large enough and not more, or they will waste gas.
        uint256 stateTreeMaxLeafIndex = uint256(2) ** _treeDepths.globalStateTreeDepth - 1;
        require(_maxValues.maxUsers <= stateTreeMaxLeafIndex, "Unirep: invalid maxUsers value");
        maxUsers = _maxValues.maxUsers;

        // Calculate and store the empty user state tree root. This value must
        // be set before we call hashedBlankStateLeaf() later
        emptyUserStateRoot = calcEmptyUserStateTreeRoot(_treeDepths.userStateTreeDepth);

        // Compute the hash of a blank state leaf
        uint256 h = hashedBlankStateLeaf();

        // Create the state tree
        stateTree = new IncrementalMerkleTree(_treeDepths.globalStateTreeDepth, h);
    }
}