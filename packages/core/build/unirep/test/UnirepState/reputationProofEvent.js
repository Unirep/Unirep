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
describe('Reputation proof events in Unirep State', function () {
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
    const userNum = 5;
    const airdropPosRep = 10;
    const spendReputation = 4;
    let fromProofIndex = 0;
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
    describe('Reputation proof event', async () => {
        let epochKey;
        let proofIndex;
        let epoch;
        const userIdx = 2;
        let repNullifier;
        it('submit valid reputation proof event', async () => {
            const epkNonce = 0;
            epoch = Number(await unirepContract.currentEpoch());
            const reputationRecords = {};
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx];
            repNullifier = (0, core_1.genReputationNullifier)(userIds[userIdx].getNullifier(), epoch, 0, attesterId);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const circuitInputs = await (0, utils_1.genReputationCircuitInput)(userIds[userIdx], epoch, epkNonce, GSTree, userIdx, reputationRecords, Number(attesterId), spendReputation);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.proveReputation, circuitInputs);
            const repProofInput = new contracts_1.ReputationProof(publicSignals, proof);
            const isValid = await repProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = repProofInput.epochKey;
            proofIndex = Number(await unirepContract.getProofIndex(repProofInput.hash()));
            await (0, chai_1.expect)(unirepContractCalledByAttester.spendReputation(repProofInput, { value: core_1.attestingFee }))
                .to.be.revertedWith('Unirep: the proof has been submitted before');
        });
        it('spendReputation event should update Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(1);
            // nullifiers should be added to unirepState
            (0, chai_1.expect)(unirepState.nullifierExist(repNullifier)).to.be.true;
        });
        it('submit attestations to the epoch key should update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, fromProofIndex, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(2);
            (0, chai_1.expect)(attestations[1].toJSON()).equal(attestation.toJSON());
        });
        it('spend reputation event can attest to other epoch key and update Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            epoch = Number(await unirepContract.currentEpoch());
            const epkNonce = 0;
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const otherUserIdx = 0;
            const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userIds[otherUserIdx], GSTree, otherUserIdx, userStateTreeRoots[otherUserIdx], epoch, epkNonce);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
            const epkProofInput = new contracts_1.EpochKeyProof(publicSignals, proof);
            const isValid = await epkProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            let tx = await unirepContract.submitEpochKeyProof(epkProofInput);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = epkProofInput.epochKey;
            const toProofIndex = Number(await unirepContract.getProofIndex(epkProofInput.hash()));
            const attestation = new core_1.Attestation(BigInt(attesterId), BigInt(spendReputation), BigInt(0), BigInt(0), BigInt(0));
            tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, toProofIndex, proofIndex, { value: core_1.attestingFee });
            receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepStateAfterAttest = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepStateAfterAttest.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(1);
            (0, chai_1.expect)(attestations[0].toJSON()).equal(attestation.toJSON());
        });
        it('submit valid reputation proof event with same nullifiers', async () => {
            const epkNonce = 1;
            epoch = Number(await unirepContract.currentEpoch());
            const reputationRecords = {};
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx];
            repNullifier = (0, core_1.genReputationNullifier)(userIds[userIdx].getNullifier(), epoch, 0, attesterId);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const circuitInputs = await (0, utils_1.genReputationCircuitInput)(userIds[userIdx], epoch, epkNonce, GSTree, userIdx, reputationRecords, Number(attesterId), spendReputation);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.proveReputation, circuitInputs);
            (0, chai_1.expect)(publicSignals[0]).equal(repNullifier.toString());
            const repProofInput = new contracts_1.ReputationProof(publicSignals, proof);
            const isValid = await repProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = repProofInput.epochKey;
            proofIndex = Number(await unirepContract.getProofIndex(repProofInput.hash()));
        });
        it('duplicated nullifier should not update Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, fromProofIndex, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit invalid reputation proof event', async () => {
            const epkNonce = 1;
            const spendReputation = Math.ceil(Math.random() * core_1.maxReputationBudget);
            epoch = Number(await unirepContract.currentEpoch());
            const reputationRecords = {};
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx];
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const circuitInputs = await (0, utils_1.genReputationCircuitInput)(userIds[userIdx], epoch, epkNonce, GSTree, userIdx, reputationRecords, Number(attesterId), spendReputation);
            circuitInputs.GST_root = (0, crypto_1.genRandomSalt)().toString();
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.proveReputation, circuitInputs);
            const repProofInput = new contracts_1.ReputationProof(publicSignals, proof);
            const isValid = await repProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.false;
            const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = repProofInput.epochKey;
            proofIndex = Number(await unirepContract.getProofIndex(repProofInput.hash()));
        });
        it('spendReputation event should not update Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, fromProofIndex, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('invalid reputation proof with from proof index should not update Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            epoch = Number(await unirepContract.currentEpoch());
            const epkNonce = 0;
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const otherUserIdx = 0;
            const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userIds[otherUserIdx], GSTree, otherUserIdx, userStateTreeRoots[otherUserIdx], epoch, epkNonce);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
            const epkProofInput = new contracts_1.EpochKeyProof(publicSignals, proof);
            const isValid = await epkProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            let tx = await unirepContract.submitEpochKeyProof(epkProofInput);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = epkProofInput.epochKey;
            const toProofIndex = Number(await unirepContract.getProofIndex(epkProofInput.hash()));
            const attestation = new core_1.Attestation(BigInt(attesterId), BigInt(spendReputation), BigInt(0), BigInt(0), BigInt(0));
            tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, toProofIndex, proofIndex, { value: core_1.attestingFee });
            receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepStateAfterAttest = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(unirepState.toJSON()).equal(unirepStateAfterAttest.toJSON());
        });
        it('submit valid reputation proof with wrong GST root event', async () => {
            const epkNonce = 1;
            const ZERO_VALUE = 0;
            const reputationRecords = {};
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx];
            const userStateTree = await (0, utils_1.genNewUserStateTree)();
            for (const attester of Object.keys(reputationRecords)) {
                await userStateTree.update(BigInt(attester), reputationRecords[attester].hash());
            }
            const GSTree = new crypto_1.IncrementalMerkleTree(core_1.circuitGlobalStateTreeDepth, ZERO_VALUE, 2);
            const id = (0, crypto_1.genIdentity)();
            const commitment = (0, crypto_1.genIdentityCommitment)(id);
            const stateRoot = userStateTree.getRootHash();
            const leafIndex = 0;
            const hashedStateLeaf = (0, crypto_1.hashLeftRight)(commitment, stateRoot);
            GSTree.insert(BigInt(hashedStateLeaf.toString()));
            const circuitInputs = await (0, utils_1.genReputationCircuitInput)(id, epoch, epkNonce, GSTree, leafIndex, reputationRecords, BigInt(attesterId));
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.proveReputation, circuitInputs);
            const repProofInput = new contracts_1.ReputationProof(publicSignals, proof);
            const isValid = await repProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            const tx = await unirepContractCalledByAttester.spendReputation(repProofInput, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            epochKey = repProofInput.epochKey;
            proofIndex = Number(await unirepContract.getProofIndex(repProofInput.hash()));
        });
        it('spendReputation event should not update Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit attestations to the epoch key should not update Unirep state', async () => {
            const attestation = (0, utils_1.genRandomAttestation)();
            attestation.attesterId = BigInt(attesterId);
            const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, fromProofIndex, { value: core_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const attestations = unirepState.getAttestations(epochKey);
            (0, chai_1.expect)(attestations.length).equal(0);
        });
        it('submit valid reputation proof event in wrong epoch should fail', async () => {
            const epkNonce = 1;
            const spendReputation = Math.floor(Math.random() * core_1.maxReputationBudget);
            const wrongEpoch = epoch + 1;
            const reputationRecords = {};
            reputationRecords[attesterId.toString()] = signUpAirdrops[userIdx];
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const GSTree = unirepState.genGSTree(unirepState.currentEpoch);
            const circuitInputs = await (0, utils_1.genReputationCircuitInput)(userIds[userIdx], wrongEpoch, epkNonce, GSTree, userIdx, reputationRecords, Number(attesterId), spendReputation);
            const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.proveReputation, circuitInputs);
            const repProofInput = new contracts_1.ReputationProof(publicSignals, proof);
            const isValid = await repProofInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            await (0, chai_1.expect)(unirepContractCalledByAttester.spendReputation(repProofInput, { value: core_1.attestingFee }))
                .to.be.revertedWith('Unirep: submit a reputation proof with incorrect epoch');
        });
    });
});
