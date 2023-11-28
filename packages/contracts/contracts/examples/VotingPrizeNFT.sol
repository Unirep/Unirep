// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage} from '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import {ERC721} from '@openzeppelin/contracts/token/ERC721/ERC721.sol';

/// @title VotingPrizeNFT
contract VotingPrizeNFT is ERC721URIStorage {
    uint256 private _tokenIds;

    address public owner;
    address public voting;
    string public metadataURI;

    constructor(string memory _metadataURI) ERC721('VotingPrizeNFT', 'Prize') {
        owner = msg.sender;
        metadataURI = _metadataURI;
    }

    function setVotingAddress(address _voting) public {
        require(msg.sender == owner);
        voting = _voting;
    }

    function awardItem(address winner) public returns (uint256) {
        require(msg.sender == voting);
        uint256 newItemId = _tokenIds;
        _mint(winner, newItemId);
        _setTokenURI(newItemId, metadataURI);

        unchecked {
            _tokenIds++;
        }
        return newItemId;
    }
}
