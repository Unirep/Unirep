"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const utils_1 = require("./utils");
const src_1 = require("../src");
const config_1 = require("../config");
describe('User State Transition', function () {
    this.timeout(600000);
    let accounts;
    let unirepContract;
    const epoch = 1;
    const user = (0, crypto_1.genIdentity)();
    const proofIndexes = [];
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths);
    });
    it('Valid user state update inputs should work', async () => {
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(user, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        const isValid = await input.verify();
        (0, chai_1.expect)(isValid, 'Verify user state transition proof off-chain failed').to.be.true;
        const isProofValid = await unirepContract.verifyUserStateTransition(input);
        (0, chai_1.expect)(isProofValid).to.be.true;
        // UST should be performed after epoch transition
        // Fast-forward epochLength of seconds
        await hardhat_1.ethers.provider.send("evm_increaseTime", [config_1.epochLength]);
        let tx = await unirepContract.beginEpochTransition();
        let receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        tx = await unirepContract.updateUserStateRoot(input, proofIndexes);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const pfIdx = await unirepContract.getProofIndex(input.hash());
        (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
    });
    it('Proof with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1;
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(user, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        input.transitionFromEpoch = wrongEpoch;
        const isProofValid = await unirepContract.verifyUserStateTransition(input);
        (0, chai_1.expect)(isProofValid).to.be.false;
    });
    it('Proof with wrong global state tree root should fail', async () => {
        const wrongGlobalStateTreeRoot = (0, crypto_1.genRandomSalt)();
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(user, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        input.fromGlobalStateTree = wrongGlobalStateTreeRoot;
        const isProofValid = await unirepContract.verifyUserStateTransition(input);
        (0, chai_1.expect)(isProofValid).to.be.false;
    });
    it('Proof with wrong epoch tree root should fail', async () => {
        const wrongEpochTreeRoot = (0, crypto_1.genRandomSalt)();
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(user, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        input.fromEpochTree = wrongEpochTreeRoot;
        const isProofValid = await unirepContract.verifyUserStateTransition(input);
        (0, chai_1.expect)(isProofValid).to.be.false;
    });
    it('Proof with wrong blinded user states should fail', async () => {
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(user, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        input.blindedUserStates[0] = (0, crypto_1.genRandomSalt)();
        const isProofValid = await unirepContract.verifyUserStateTransition(input);
        (0, chai_1.expect)(isProofValid).to.be.false;
    });
    it('Proof with wrong blinded hash chain should fail', async () => {
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(user, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        input.blindedHashChains[0] = (0, crypto_1.genRandomSalt)();
        const isProofValid = await unirepContract.verifyUserStateTransition(input);
        (0, chai_1.expect)(isProofValid).to.be.false;
    });
    it('Proof with wrong global state tree leaf should fail', async () => {
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(user, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        input.newGlobalStateTreeLeaf = (0, crypto_1.genRandomSalt)();
        const isProofValid = await unirepContract.verifyUserStateTransition(input);
        (0, chai_1.expect)(isProofValid).to.be.false;
    });
});
