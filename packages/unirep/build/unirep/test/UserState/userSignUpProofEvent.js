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
describe('User sign up proof (Airdrop proof) events in Unirep User State', function () {
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
    let attesterId;
    const maxUsers = (2 ** core_1.circuitGlobalStateTreeDepth) - 1;
    const userNum = Math.ceil(Math.random() * maxUsers);
    const fromProofIndex = 0;
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
    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const id = (0, crypto_1.genIdentity)();
            const initUnirepState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
            const contractEpoch = await unirepContract.currentEpoch();
            const unirepEpoch = initUnirepState.getUnirepStateCurrentEpoch();
            (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
            const unirepGSTree = initUnirepState.getUnirepStateGSTree(unirepEpoch);
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
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = userState.getUnirepStateCurrentEpoch();
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
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
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = userState.getUnirepStateCurrentEpoch();
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
                const newUSTRoot = await (0, core_1.computeInitUserStateRoot)(_treeDepths.userStateTreeDepth);
                const newGSTLeaf = (0, crypto_1.hashLeftRight)(commitment, newUSTRoot);
                userStateTreeRoots.push(newUSTRoot);
                signUpAirdrops.push(core_1.Reputation.default());
                GSTree.insert(newGSTLeaf);
                rootHistories.push(GSTree.root);
            }
        });
        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const id = (0, crypto_1.genIdentity)();
            const commitment = (0, crypto_1.genIdentityCommitment)(id);
            const userStateBefore = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
            const GSTRootBefore = userStateBefore.getUnirepStateGSTree(1).root;
            await (0, chai_1.expect)(unirepContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: maximum number of user signups reached');
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
            const GSTRoot = userState.getUnirepStateGSTree(1).root;
            (0, chai_1.expect)(GSTRoot).equal(GSTRootBefore);
        });
        it('Check GST roots match Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(root, unirepState.currentEpoch);
                (0, chai_1.expect)(exist).to.be.true;
            }
        });
    });
    describe('Airdrop proof event', async () => {
        let epochKey;
        let proofIndex;
        let epoch;
        const userIdx = 3;
        it('submit airdrop proof event', async () => {
            epoch = Number(await unirepContract.currentEpoch());
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[userIdx]);
            const { proof, publicSignals } = await userState.genUserSignUpProof(BigInt(attesterId));
            const airdropProofInput = new contracts_1.SignUpProof(publicSignals, proof);
            const isValid = await airdropProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            const tx = await unirepContractCalledByAttester.airdropEpochKey(airdropProofInput, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = airdropProofInput.epochKey;
            proofIndex = Number(await unirepContract.getProofIndex(airdropProofInput.hash()));
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(airdropProofInput, { value: core_1.attestingFee }))
                .to.be.revertedWith('Unirep: the proof has been submitted before');
        });
        it('airdropEpochKey event should update Unirep state', async () => {
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[0]);
            const attestations = userState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(1);
        });
        it('submit attestations to the epoch key should update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, fromProofIndex, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[0]);
            const attestations = userState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(2);
            (0, chai_1.expect)(attestations[1].toJSON()).equal(attestation.toJSON());
        });
        it('submit invalid airdrop proof event', async () => {
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[userIdx]);
            const { proof, publicSignals } = await userState.genUserSignUpProof(BigInt(attesterId));
            publicSignals[2] = (0, crypto_1.genRandomSalt)().toString();
            const airdropProofInput = new contracts_1.SignUpProof(publicSignals, proof);
            const isValid = await airdropProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.false;
            const tx = await unirepContractCalledByAttester.airdropEpochKey(airdropProofInput, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = airdropProofInput.epochKey;
            proofIndex = Number(await unirepContract.getProofIndex(airdropProofInput.hash()));
        });
        it('airdropEpochKey event should not update User state', async () => {
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[0]);
            const attestations = userState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(2);
        });
        it('submit attestations to the epoch key should update User state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, fromProofIndex, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[0]);
            const attestations = userState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(2);
        });
        it('submit valid sign up proof with wrong GST root event', async () => {
            const ZERO_VALUE = 0;
            const reputationRecords = {};
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx];
            const userStateTree = await (0, utils_1.genNewUserStateTree)();
            for (const attester of Object.keys(reputationRecords)) {
                await userStateTree.update(BigInt(attester), reputationRecords[attester].hash());
            }
            const GSTree = new crypto_1.IncrementalQuinTree(core_1.circuitGlobalStateTreeDepth, ZERO_VALUE, 2);
            const id = (0, crypto_1.genIdentity)();
            const commitment = (0, crypto_1.genIdentityCommitment)(id);
            const stateRoot = userStateTree.getRootHash();
            const leafIndex = 0;
            const hashedStateLeaf = (0, crypto_1.hashLeftRight)(commitment, stateRoot);
            GSTree.insert(BigInt(hashedStateLeaf.toString()));
            const circuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(id, epoch, GSTree, leafIndex, reputationRecords, BigInt(attesterId));
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.proveUserSignUp, circuitInputs);
            const airdropProofInput = new contracts_1.SignUpProof(publicSignals, proof);
            const isValid = await airdropProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            const tx = await unirepContractCalledByAttester.airdropEpochKey(airdropProofInput, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = airdropProofInput.epochKey;
            proofIndex = Number(await unirepContract.getProofIndex(airdropProofInput.hash()));
        });
        it('airdropEpochKey event should not update User state', async () => {
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[0]);
            const attestations = userState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit attestations to the epoch key should update User state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, fromProofIndex, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[0]);
            const attestations = userState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit valid sign up proof event in wrong epoch should fail', async () => {
            const wrongEpoch = epoch + 1;
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const reputationRecords = {};
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx];
            const circuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userIds[userIdx], wrongEpoch, GSTree, userIdx, reputationRecords, BigInt(attesterId));
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.proveUserSignUp, circuitInputs);
            const airdropProofInput = new contracts_1.SignUpProof(publicSignals, proof);
            const isValid = await airdropProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(airdropProofInput, { value: core_1.attestingFee }))
                .to.be.revertedWith('Unirep: submit an airdrop proof with incorrect epoch');
        });
    });
});
