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
describe('Verify Epoch Key verifier', function () {
    this.timeout(30000);
    let ZERO_VALUE = 0;
    const maxEPK = BigInt(2 ** config_1.circuitEpochTreeDepth);
    let unirepContract;
    let accounts;
    let id, commitment, stateRoot;
    let tree;
    let nonce, currentEpoch;
    let leafIndex = 0;
    let input;
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths);
        tree = new crypto_1.IncrementalQuinTree(config_1.circuitGlobalStateTreeDepth, ZERO_VALUE, 2);
        id = (0, crypto_1.genIdentity)();
        commitment = (0, crypto_1.genIdentityCommitment)(id);
        stateRoot = (0, crypto_1.genRandomSalt)();
        const hashedStateLeaf = (0, crypto_1.hashLeftRight)(commitment.toString(), stateRoot.toString());
        tree.insert(BigInt(hashedStateLeaf.toString()));
        nonce = 0;
        currentEpoch = 1;
    });
    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i < config_1.numEpochKeyNoncePerEpoch; i++) {
            const n = i;
            const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(id, tree, leafIndex, stateRoot, currentEpoch, n);
            input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
            const isValid = await input.verify();
            (0, chai_1.expect)(isValid, 'Verify epoch key proof off-chain failed').to.be.true;
            let tx = await unirepContract.submitEpochKeyProof(input);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const isProofValid = await unirepContract.verifyEpochKeyValidity(input);
            (0, chai_1.expect)(isProofValid, 'Verify epk proof on-chain failed').to.be.true;
            const pfIdx = await unirepContract.getProofIndex(input.hash());
            (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
        }
    });
    it('Invalid epoch key should not pass check', async () => {
        // Validate against invalid epoch key
        const invalidEpochKey1 = maxEPK;
        const invalidCircuitInputs = (0, utils_1.genEpochKeyCircuitInput)(id, tree, leafIndex, stateRoot, currentEpoch, nonce);
        invalidCircuitInputs.epoch_key = invalidEpochKey1;
        input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.verifyEpochKey, invalidCircuitInputs);
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input);
        (0, chai_1.expect)(isProofValid, 'Verify epk proof on-chain should fail').to.be.false;
    });
    it('Wrong Id should not pass check', async () => {
        const fakeId = (0, crypto_1.genIdentity)();
        const invalidCircuitInputs = (0, utils_1.genEpochKeyCircuitInput)(fakeId, tree, leafIndex, stateRoot, currentEpoch, nonce);
        input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.verifyEpochKey, invalidCircuitInputs);
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input);
        (0, chai_1.expect)(isProofValid, 'Verify epk proof on-chain should fail').to.be.false;
    });
    it('Mismatched GST tree root should not pass check', async () => {
        const otherTreeRoot = (0, crypto_1.genRandomSalt)();
        const invalidCircuitInputs = (0, utils_1.genEpochKeyCircuitInput)(id, tree, leafIndex, otherTreeRoot, currentEpoch, nonce);
        input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.verifyEpochKey, invalidCircuitInputs);
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input);
        (0, chai_1.expect)(isProofValid, 'Verify epk proof on-chain should fail').to.be.false;
    });
    it('Invalid epoch should not pass check', async () => {
        const invalidNonce = config_1.numEpochKeyNoncePerEpoch;
        const invalidCircuitInputs = (0, utils_1.genEpochKeyCircuitInput)(id, tree, leafIndex, stateRoot, currentEpoch, invalidNonce);
        input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.verifyEpochKey, invalidCircuitInputs);
        const isProofValid = await unirepContract.verifyEpochKeyValidity(input);
        (0, chai_1.expect)(isProofValid, 'Verify epk proof on-chain should fail').to.be.false;
    });
});
