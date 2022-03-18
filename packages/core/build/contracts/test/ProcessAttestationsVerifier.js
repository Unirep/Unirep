"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const utils_1 = require("./utils");
const config_1 = require("../config");
const src_1 = require("../src");
describe('Process attestation circuit', function () {
    this.timeout(300000);
    let accounts;
    let unirepContract;
    const epoch = BigInt(1);
    const nonce = BigInt(0);
    const user = (0, crypto_1.genIdentity)();
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths);
    });
    it('successfully process attestations', async () => {
        const { circuitInputs } = await (0, utils_1.genProcessAttestationsCircuitInput)(user, epoch, nonce, nonce);
        const { outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.processAttestations, circuitInputs);
        const isProofValid = await unirepContract.verifyProcessAttestationProof(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
        (0, chai_1.expect)(isProofValid).to.be.true;
        const tx = await unirepContract.processAttestations(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const pfIdx = await unirepContract.getProofIndex((0, src_1.computeProcessAttestationsProofHash)(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof));
        (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
    });
    it('successfully process zero attestations', async () => {
        let zeroSelectors = [];
        for (let i = 0; i < config_1.numAttestationsPerProof; i++) {
            zeroSelectors.push(0);
        }
        const { circuitInputs } = await (0, utils_1.genProcessAttestationsCircuitInput)(user, epoch, nonce, nonce, zeroSelectors);
        const { outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.processAttestations, circuitInputs);
        const isProofValid = await unirepContract.verifyProcessAttestationProof(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
        (0, chai_1.expect)(isProofValid).to.be.true;
        const tx = await unirepContract.processAttestations(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const pfIdx = await unirepContract.getProofIndex((0, src_1.computeProcessAttestationsProofHash)(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof));
        (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
    });
});
