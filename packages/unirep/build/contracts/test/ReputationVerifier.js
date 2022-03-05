"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const circuits_1 = require("@unirep/circuits");
const crypto_1 = require("@unirep/crypto");
const config_1 = require("../config");
const utils_1 = require("./utils");
const src_1 = require("../src");
describe('Verify reputation verifier', function () {
    this.timeout(30000);
    let unirepContract;
    let unirepContractCalledByAttester;
    let accounts;
    const epoch = 1;
    const nonce = 1;
    const user = (0, crypto_1.genIdentity)();
    const NUM_ATTESTERS = 10;
    let attesterId;
    let reputationRecords = {};
    const MIN_POS_REP = 20;
    const MAX_NEG_REP = 10;
    const repNullifiersAmount = 3;
    let minRep = MIN_POS_REP - MAX_NEG_REP;
    const proveGraffiti = 1;
    const signUp = 1;
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths);
        // Bootstrap reputation
        for (let i = 0; i < NUM_ATTESTERS; i++) {
            let attesterId = Math.ceil(Math.random() * (2 ** config_1.circuitUserStateTreeDepth - 1));
            while (reputationRecords[attesterId] !== undefined)
                attesterId = Math.floor(Math.random() * (2 ** config_1.circuitUserStateTreeDepth));
            const graffitiPreImage = (0, crypto_1.genRandomSalt)();
            reputationRecords[attesterId] = new utils_1.Reputation(BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP), BigInt(Math.floor(Math.random() * MAX_NEG_REP)), (0, crypto_1.hashOne)(graffitiPreImage), BigInt(signUp));
            reputationRecords[attesterId].addGraffitiPreImage(graffitiPreImage);
        }
    });
    it('successfully prove a random generated reputation', async () => {
        const attesterIds = Object.keys(reputationRecords);
        attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)];
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        const isValid = await input.verify();
        (0, chai_1.expect)(isValid, 'Verify reputation proof off-chain failed').to.be.true;
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain failed').to.be.true;
    });
    it('mismatched reputation nullifiers and nullifiers amount should fail', async () => {
        const wrongReputationNullifierAmount = repNullifiersAmount + 1;
        const invalidCircuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount);
        invalidCircuitInputs.rep_nullifiers_amount = wrongReputationNullifierAmount;
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, invalidCircuitInputs);
        const isValid = await input.verify();
        (0, chai_1.expect)(isValid, 'Verify reputation proof off-chain should fail').to.be.false;
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false;
    });
    it('wrong nullifiers should fail', async () => {
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount);
        let input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        // random reputation nullifiers
        for (let i = 0; i < config_1.maxReputationBudget; i++) {
            input.repNullifiers[i] = (0, crypto_1.genRandomSalt)();
        }
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false;
    });
    it('wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1;
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        input.epoch = wrongEpoch;
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false;
    });
    it('wrong nonce epoch key should fail', async () => {
        const wrongEpochKey = (0, utils_1.genEpochKey)(user['identityNullifier'], epoch, nonce + 1, config_1.circuitEpochTreeDepth);
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        input.epochKey = wrongEpochKey;
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false;
    });
    it('wrong attesterId should fail', async () => {
        const wrongAttesterId = attesterId + 1;
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        input.attesterId = wrongAttesterId;
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false;
    });
    it('wrong minRep should fail', async () => {
        const wrongMinRep = minRep + 1;
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        input.minRep = wrongMinRep;
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false;
    });
    it('wrong graffiti preimage should fail', async () => {
        const wrongGraffitiPreimage = (0, crypto_1.genRandomSalt)();
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep, proveGraffiti);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        input.graffitiPreImage = wrongGraffitiPreimage;
        const isProofValid = await unirepContract.verifyReputation(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false;
    });
    it('sign up should succeed', async () => {
        const attester = accounts[1];
        const attesterAddress = await attester.getAddress();
        unirepContractCalledByAttester = await hardhat_1.ethers.getContractAt(src_1.Unirep.abi, unirepContract.address, attester);
        const tx = await unirepContractCalledByAttester.attesterSignUp();
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        attesterId = BigInt(await unirepContract.attesters(attesterAddress));
    });
    it('submit reputation nullifiers should succeed', async () => {
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep, proveGraffiti);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        const tx = await unirepContractCalledByAttester.spendReputation(input, { value: config_1.attestingFee });
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const pfIdx = await unirepContract.getProofIndex(input.hash());
        (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
    });
    it('submit reputation nullifiers with wrong length of nullifiers should fail', async () => {
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep, proveGraffiti);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        const wrongNullifiers = input.repNullifiers.slice(1, config_1.maxReputationBudget);
        input.repNullifiers = wrongNullifiers;
        await (0, chai_1.expect)(unirepContractCalledByAttester.spendReputation(input, { value: config_1.attestingFee })).to.be.revertedWith('Unirep: invalid number of reputation nullifiers');
    });
    it('submit reputation nullifiers with wrong epoch key should fail', async () => {
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep, proveGraffiti);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        input.epochKey = (0, crypto_1.genRandomSalt)();
        await (0, chai_1.expect)(unirepContractCalledByAttester.spendReputation(input, { value: config_1.attestingFee })).to.be.revertedWith('Unirep: invalid epoch key range');
    });
});
