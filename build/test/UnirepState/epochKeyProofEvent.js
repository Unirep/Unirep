"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const contracts_1 = require("@unirep/contracts");
const core_1 = require("../../core");
const utils_1 = require("../utils");
const crypto_2 = require("@unirep/crypto");
describe('Epoch key proof events in Unirep State', function () {
    this.timeout(500000);
    let users = new Array(2);
    let userIds = [];
    let userCommitments = [];
    let userStateTreeRoots = [];
    let signUpAirdrops = [];
    let unirepContract;
    let unirepContractCalledByAttester;
    let _treeDepths = (0, utils_1.getTreeDepthsForTesting)("circuit");
    let accounts;
    const attester = new Object();
    let attesterId;
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
            attesterId = await unirepContract.attesters(attester['addr']);
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
    describe('Epoch key proof event', async () => {
        let epochKey;
        let proofIndex;
        let epoch;
        const userIdx = 1;
        it('submit valid epoch key proof event', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            epoch = Number(await unirepContract.currentEpoch());
            const epkNonce = 0;
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userIds[userIdx], GSTree, userIdx, userStateTreeRoots[userIdx], epoch, epkNonce);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
            const epkProofInput = new contracts_1.EpochKeyProof(publicSignals, proof);
            const isValid = await epkProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            const tx = await unirepContract.submitEpochKeyProof(epkProofInput);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = epkProofInput.epochKey;
            const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput);
            proofIndex = Number(await unirepContract.getProofIndex(hashedProof));
            // submit the same proof twice should fail
            await (0, chai_1.expect)(unirepContract.submitEpochKeyProof(epkProofInput))
                .to.be.revertedWith('Unirep: the proof has been submitted before');
        });
        it('submit attestations to the epoch key should update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(1);
            (0, chai_1.expect)(attestations[0].toJSON()).equal(attestation.toJSON());
        });
        it('submit invalid epoch key proof event', async () => {
            const userIdx = Math.floor(Math.random() * users.length);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const epkNonce = 1;
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userIds[userIdx], GSTree, userIdx, userStateTreeRoots[userIdx], epoch, epkNonce);
            circuitInputs.GST_root = (0, crypto_1.genRandomSalt)().toString();
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
            const epkProofInput = new contracts_1.EpochKeyProof(publicSignals, proof);
            const isValid = await epkProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.false;
            const tx = await unirepContract.submitEpochKeyProof(epkProofInput);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = epkProofInput.epochKey;
            const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput);
            proofIndex = Number(await unirepContract.getProofIndex(hashedProof));
        });
        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit valid epoch key proof with wrong GST root event', async () => {
            const ZERO_VALUE = 0;
            const GSTree = new crypto_2.IncrementalQuinTree(core_1.circuitGlobalStateTreeDepth, ZERO_VALUE, 2);
            const id = (0, crypto_1.genIdentity)();
            const commitment = (0, crypto_1.genIdentityCommitment)(id);
            const stateRoot = (0, crypto_1.genRandomSalt)();
            const leafIndex = 0;
            const hashedStateLeaf = (0, crypto_1.hashLeftRight)(commitment, stateRoot);
            GSTree.insert(BigInt(hashedStateLeaf.toString()));
            const epkNonce = 0;
            const epoch = 1;
            const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(id, GSTree, leafIndex, stateRoot, epoch, epkNonce);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
            const epkProofInput = new contracts_1.EpochKeyProof(publicSignals, proof);
            const isValid = await epkProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            const tx = await unirepContract.submitEpochKeyProof(epkProofInput);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = epkProofInput.epochKey;
            const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput);
            proofIndex = Number(await unirepContract.getProofIndex(hashedProof));
        });
        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit valid epoch key proof event in wrong epoch', async () => {
            const userIdx = Math.floor(Math.random() * users.length);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const wrongEpoch = epoch + 1;
            const epkNonce = Math.floor(Math.random() * core_1.numEpochKeyNoncePerEpoch);
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userIds[userIdx], GSTree, userIdx, userStateTreeRoots[userIdx], wrongEpoch, epkNonce);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
            const epkProofInput = new contracts_1.EpochKeyProof(publicSignals, proof);
            const isValid = await epkProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            await (0, chai_1.expect)(unirepContract.submitEpochKeyProof(epkProofInput))
                .to.be.revertedWith('Unirep: submit an epoch key proof with incorrect epoch');
        });
    });
});
