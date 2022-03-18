"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const contracts_1 = require("@unirep/contracts");
const core_1 = require("../../core");
const utils_1 = require("../utils");
describe('User sign up events in Unirep State', function () {
    this.timeout(500000);
    let userIds = [];
    let userCommitments = [];
    let userStateTreeRoots = [];
    let signUpAirdrops = [];
    let unirepContract;
    let unirepContractCalledByAttester;
    let _treeDepths = (0, utils_1.getTreeDepthsForTesting)("circuit");
    let accounts;
    const attester = new Object();
    const maxUsers = (2 ** core_1.circuitGlobalStateTreeDepth) - 1;
    const userNum = Math.ceil(Math.random() * maxUsers);
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: core_1.maxAttesters,
            numEpochKeyNoncePerEpoch: core_1.numEpochKeyNoncePerEpoch,
            maxReputationBudget: core_1.maxReputationBudget,
            epochLength: core_1.epochLength,
            attestingFee: core_1.attestingFee
        };
        unirepContract = await (0, contracts_1.deployUnirep)(accounts[0], _treeDepths, _settings);
    });
    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2];
            attester['addr'] = await attester['acct'].getAddress();
            unirepContractCalledByAttester = unirepContract.connect(attester['acct']);
            let tx = await unirepContractCalledByAttester.attesterSignUp();
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status, 'Attester signs up failed').to.equal(1);
        });
        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10;
            const tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const airdroppedAmount = await unirepContract.airdropAmount(attester['addr']);
            (0, chai_1.expect)(airdroppedAmount.toNumber()).equal(airdropPosRep);
        });
    });
    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const contractEpoch = await unirepContract.currentEpoch();
            const unirepEpoch = initUnirepState.currentEpoch;
            (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch);
            (0, chai_1.expect)(unirepGSTLeaves).equal(0);
            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch);
            const defaultGSTree = (0, utils_1.genNewGST)(_treeDepths.globalStateTreeDepth, _treeDepths.userStateTreeDepth);
            (0, chai_1.expect)(unirepGSTree.root).equal(defaultGSTree.root);
        });
    });
    describe('User Sign Up event', async () => {
        const GSTree = (0, utils_1.genNewGST)(_treeDepths.globalStateTreeDepth, _treeDepths.userStateTreeDepth);
        const rootHistories = [];
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = (0, crypto_1.genIdentity)();
                const commitment = (0, crypto_1.genIdentityCommitment)(id);
                userIds.push(id);
                userCommitments.push(commitment);
                const tx = await unirepContractCalledByAttester.userSignUp(commitment);
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status, 'User sign up failed').to.equal(1);
                await (0, chai_1.expect)(unirepContractCalledByAttester.userSignUp(commitment))
                    .to.be.revertedWith('Unirep: the user has already signed up');
                const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = unirepState.currentEpoch;
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch);
                (0, chai_1.expect)(unirepGSTLeaves).equal(i + 1);
                const attesterId = await unirepContract.attesters(attester['addr']);
                const airdroppedAmount = await unirepContract.airdropAmount(attester['addr']);
                const newUSTRoot = await (0, core_1.computeInitUserStateRoot)(_treeDepths.userStateTreeDepth, Number(attesterId), Number(airdroppedAmount));
                const newGSTLeaf = (0, crypto_1.hashLeftRight)(commitment, newUSTRoot);
                userStateTreeRoots.push(newUSTRoot);
                signUpAirdrops.push(new core_1.Reputation(BigInt(airdroppedAmount), BigInt(0), BigInt(0), BigInt(1)));
                GSTree.insert(newGSTLeaf);
                rootHistories.push(GSTree.root);
            }
        });
        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const id = (0, crypto_1.genIdentity)();
                const commitment = (0, crypto_1.genIdentityCommitment)(id);
                userIds.push(id);
                userCommitments.push(commitment);
                const tx = await unirepContract.userSignUp(commitment);
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status, 'User sign up failed').to.equal(1);
                const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = unirepState.currentEpoch;
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch);
                (0, chai_1.expect)(unirepGSTLeaves).equal(userNum + i + 1);
                const newUSTRoot = await (0, core_1.computeInitUserStateRoot)(_treeDepths.userStateTreeDepth);
                const newGSTLeaf = (0, crypto_1.hashLeftRight)(commitment, newUSTRoot);
                userStateTreeRoots.push(newUSTRoot);
                signUpAirdrops.push(core_1.Reputation.default());
                GSTree.insert(newGSTLeaf);
                rootHistories.push(GSTree.root);
            }
        });
        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const unirepStateBefore = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const unirepEpoch = unirepStateBefore.currentEpoch;
            const unirepGSTLeavesBefore = unirepStateBefore.getNumGSTLeaves(unirepEpoch);
            const id = (0, crypto_1.genIdentity)();
            const commitment = (0, crypto_1.genIdentityCommitment)(id);
            await (0, chai_1.expect)(unirepContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: maximum number of user signups reached');
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch);
            (0, chai_1.expect)(unirepGSTLeaves).equal(unirepGSTLeavesBefore);
        });
        it('Check GST roots match Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(root, unirepState.currentEpoch);
                (0, chai_1.expect)(exist).to.be.true;
            }
        });
    });
});
