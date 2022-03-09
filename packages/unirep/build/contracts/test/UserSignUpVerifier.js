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
describe('Verify user sign up verifier', function () {
    this.timeout(30000);
    let unirepContract;
    let accounts;
    const epoch = 1;
    const nonce = 0;
    const user = (0, crypto_1.genIdentity)();
    let reputationRecords = {};
    const MIN_POS_REP = 20;
    const MAX_NEG_REP = 10;
    const signUp = 1;
    const notSignUp = 0;
    const signedUpAttesterId = 1;
    const nonSignedUpAttesterId = 2;
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths);
        // Bootstrap reputation
        const graffitiPreImage = (0, crypto_1.genRandomSalt)();
        reputationRecords[signedUpAttesterId] = new utils_1.Reputation(BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP), BigInt(Math.floor(Math.random() * MAX_NEG_REP)), (0, crypto_1.hashOne)(graffitiPreImage), BigInt(signUp));
        reputationRecords[signedUpAttesterId].addGraffitiPreImage(graffitiPreImage);
        reputationRecords[nonSignedUpAttesterId] = new utils_1.Reputation(BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP), BigInt(Math.floor(Math.random() * MAX_NEG_REP)), (0, crypto_1.hashOne)(graffitiPreImage), BigInt(notSignUp));
        reputationRecords[nonSignedUpAttesterId].addGraffitiPreImage(graffitiPreImage);
    });
    it('successfully prove a user has signed up', async () => {
        const attesterId = signedUpAttesterId;
        const circuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(user, epoch, reputationRecords, attesterId);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, circuitInputs);
        const isValid = await input.verify();
        (0, chai_1.expect)(isValid, 'Verify user sign up proof off-chain failed').to.be.true;
        const isProofValid = await unirepContract.verifyUserSignUp(input);
        (0, chai_1.expect)(isProofValid, 'Verify reputation proof on-chain failed').to.be.true;
    });
    it('wrong attesterId should fail', async () => {
        const attesterId = signedUpAttesterId;
        const wrongAttesterId = nonSignedUpAttesterId;
        const circuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(user, epoch, reputationRecords, attesterId);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, circuitInputs);
        input.attesterId = wrongAttesterId;
        const isProofValid = await unirepContract.verifyUserSignUp(input);
        (0, chai_1.expect)(isProofValid, 'Verify user sign up proof on-chain should fail').to.be.false;
    });
    it('wrong epoch should fail', async () => {
        const attesterId = signedUpAttesterId;
        const wrongEpoch = epoch + 1;
        const circuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(user, epoch, reputationRecords, attesterId);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, circuitInputs);
        input.epoch = wrongEpoch;
        const isProofValid = await unirepContract.verifyUserSignUp(input);
        (0, chai_1.expect)(isProofValid, 'Verify user sign up proof on-chain should fail').to.be.false;
    });
    it('wrong epoch key should fail', async () => {
        const attesterId = signedUpAttesterId;
        const wrongEpochKey = (0, utils_1.genEpochKey)(user['identityNullifier'], epoch, nonce + 1, config_1.circuitEpochTreeDepth);
        const circuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(user, epoch, reputationRecords, attesterId);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, circuitInputs);
        input.epochKey = wrongEpochKey;
        const isProofValid = await unirepContract.verifyUserSignUp(input);
        (0, chai_1.expect)(isProofValid, 'Verify user sign up proof on-chain should fail').to.be.false;
    });
});
