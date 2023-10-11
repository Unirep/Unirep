// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import {Unirep} from '.././Unirep.sol';

// Uncomment this line to use console.log
// import 'hardhat/console.sol';
import {ReputationVerifierHelper} from '../verifierHelpers/ReputationVerifierHelper.sol';
import {EpochKeyVerifierHelper} from '../verifierHelpers/EpochKeyVerifierHelper.sol';
import {VotingPrizeNFT} from './VotingPrizeNFT.sol';

enum Option {
    UP,
    DOWN
}

contract UnirepVoting {
    Unirep public unirep;
    ReputationVerifierHelper public repHelper;
    EpochKeyVerifierHelper public epochKeyHelper;
    VotingPrizeNFT public nft;

    uint public immutable numProjects;

    // A list of [upvote count, downvote count] for each project.
    uint[][] public projectData;
    // A list of scores for each project that project ID is the index.
    int[] public scores;

    int public winnerScore;
    bool foundWinner = false;

    // A mapping from project ID to a list of epoch keys of joined hackers.
    mapping(uint256 => uint256[]) public participants;
    // A mapping from project ID to a count of joined hackers.
    mapping(uint256 => uint256) public counts;
    mapping(uint256 => uint256) public voted;
    mapping(uint256 => bool) claimed;

    constructor(
        Unirep _unirep,
        ReputationVerifierHelper _repHelper,
        EpochKeyVerifierHelper _epochKeyHelper,
        VotingPrizeNFT _nft,
        uint8 _numProjects,
        uint48 _epochLength
    ) {
        // set unirep address
        unirep = _unirep;

        // set reputation verifier
        repHelper = _repHelper;

        // set epoch key verifier helper
        epochKeyHelper = _epochKeyHelper;

        nft = _nft;

        unirep.attesterSignUp(_epochLength);

        // how many projects that hackers can join.
        numProjects = _numProjects;
        scores = new int[](numProjects);
        projectData = new uint[][](numProjects);
        for (uint i; i < numProjects; i++) {
            projectData[i] = new uint256[](2);
        }
    }

    // sign up users in this app
    function userSignUp(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {
        unirep.userSignUp(publicSignals, proof);
    }

    function joinProject(
        uint256 projectID,
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        require(projectID < numProjects, 'projectID out of range');
        EpochKeyVerifierHelper.EpochKeySignals memory signals = epochKeyHelper
            .verifyAndCheck(publicSignals, proof);

        require(signals.revealNonce == true, 'Voteathon: should reveal nonce');
        require(signals.nonce == 0, 'Voteathon: invalid nonce');
        require(
            counts[projectID] < 10,
            'Voteathon: maximum participants in a project'
        );
        participants[projectID].push(signals.epochKey);
        // give user data if there is attestation before
        uint48 epoch = unirep.attesterCurrentEpoch(uint160(address(this)));
        require(epoch == 0, 'Voteathon: not join epoch');
        uint256[] memory data = projectData[projectID];
        for (uint256 i = 0; i < data.length; i++) {
            unirep.attest(signals.epochKey, epoch, i, data[i]);
        }
        counts[projectID] += 1;
    }

    function vote(
        uint256 projectID,
        Option option,
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {
        require(projectID < numProjects, 'projectID out of range');

        EpochKeyVerifierHelper.EpochKeySignals memory signals = epochKeyHelper
            .verifyAndCheck(publicSignals, proof);

        require(signals.revealNonce == true, 'reveal nonce wrong');
        require(signals.nonce == 1, 'nonce wrong');
        require(signals.epoch == 0, 'invalid epoch to vote');

        projectData[projectID][uint(option)] += 1;

        voted[signals.epochKey] += 1;
        if (option == Option.UP) scores[projectID] += 1;
        else if (option == Option.DOWN) scores[projectID] -= 1;

        uint[] memory members = participants[projectID];
        uint48 epoch = unirep.attesterCurrentEpoch(uint160(address(this)));
        require(epoch == 0, 'not voting epoch');
        for (uint256 i = 0; i < members.length; i++) {
            unirep.attest(members[i], epoch, uint(option), 1);
        }
    }

    function claimPrize(
        address receiver,
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {
        uint160 attesterId = uint160(address(this));
        require(unirep.attesterCurrentEpoch(attesterId) > 0);
        ReputationVerifierHelper.ReputationSignals memory signals = repHelper
            .verifyAndCheck(publicSignals, proof);

        require(signals.epoch > 0, 'invalid epoch to claim prize');
        require(signals.revealNonce == true, 'reveal nonce wrong');
        require(signals.nonce == 1, 'nonce wrong');

        require(!claimed[signals.epochKey], 'Already claimed');
        if (!foundWinner) {
            _findWinner();
        }
        require(int(signals.minRep) >= winnerScore, 'Insufficient score');
        nft.awardItem(receiver);
        claimed[signals.epochKey] = true;
    }

    function _findWinner() internal {
        int highest = 0;
        for (uint256 i = 0; i < numProjects; i++) {
            if (scores[i] > highest) {
                highest = scores[i];
            }
        }
        winnerScore = highest;
        foundWinner = true;
    }
}
