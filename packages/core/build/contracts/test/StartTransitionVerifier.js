"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const utils_1 = require("./utils");
const config_1 = require("../config/");
const src_1 = require("../src");
describe('User State Transition circuits', function () {
    this.timeout(60000);
    const user = (0, crypto_1.genIdentity)();
    describe('Start User State Transition', () => {
        let accounts;
        let unirepContract;
        const epoch = 1;
        let GSTZERO_VALUE = 0, GSTree;
        let userStateTree;
        let hashedLeaf;
        const nonce = 0;
        const leafIndex = 0;
        before(async () => {
            accounts = await hardhat_1.ethers.getSigners();
            const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
            unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths);
            // User state tree
            const results = await (0, utils_1.bootstrapRandomUSTree)();
            userStateTree = results.userStateTree;
            // Global state tree
            GSTree = new crypto_1.IncrementalMerkleTree(config_1.circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2);
            const commitment = (0, crypto_1.genIdentityCommitment)(user);
            hashedLeaf = (0, crypto_1.hashLeftRight)(commitment, userStateTree.getRootHash());
            GSTree.insert(hashedLeaf);
        });
        describe('Start process user state tree', () => {
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = (0, utils_1.genStartTransitionCircuitInput)(user, GSTree, leafIndex, userStateTree.getRootHash(), epoch, nonce);
                const { blindedUserState, blindedHashChain, GSTRoot, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.startTransition, circuitInputs);
                const isProofValid = await unirepContract.verifyStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof);
                (0, chai_1.expect)(isProofValid).to.be.true;
                const tx = await unirepContract.startUserStateTransition(blindedUserState, blindedHashChain, GSTRoot, proof);
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).equal(1);
                const pfIdx = await unirepContract.getProofIndex((0, src_1.computeStartTransitionProofHash)(blindedUserState, blindedHashChain, GSTRoot, proof));
                (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
            });
            it('User can start with different epoch key nonce', async () => {
                const newNonce = 1;
                const circuitInputs = (0, utils_1.genStartTransitionCircuitInput)(user, GSTree, leafIndex, userStateTree.getRootHash(), epoch, newNonce);
                const { blindedUserState, blindedHashChain, GSTRoot, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.startTransition, circuitInputs);
                const isProofValid = await unirepContract.verifyStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof);
                (0, chai_1.expect)(isProofValid).to.be.true;
                const tx = await unirepContract.startUserStateTransition(blindedUserState, blindedHashChain, GSTRoot, proof);
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).equal(1);
                const pfIdx = await unirepContract.getProofIndex((0, src_1.computeStartTransitionProofHash)(blindedUserState, blindedHashChain, GSTRoot, proof));
                (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
            });
        });
    });
});
