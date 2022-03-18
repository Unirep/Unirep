"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const ethers_1 = require("ethers");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const config_1 = require("../config");
const utils_1 = require("./utils");
const src_1 = require("../src");
describe('Epoch Transition', function () {
    this.timeout(1000000);
    let ZERO_VALUE = 0;
    let unirepContract;
    let accounts;
    let userId, userCommitment;
    let attester, attesterAddress, attesterId, unirepContractCalledByAttester;
    const signedUpInLeaf = 1;
    let epochKeyProofIndex;
    const proofIndexes = [];
    const attestingFee = ethers_1.ethers.utils.parseEther("0.1");
    let fromEpoch;
    let GSTree;
    let userStateTree;
    let leafIndex;
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        const _settings = {
            maxUsers: config_1.maxUsers,
            maxAttesters: config_1.maxAttesters,
            numEpochKeyNoncePerEpoch: config_1.numEpochKeyNoncePerEpoch,
            maxReputationBudget: config_1.maxReputationBudget,
            epochLength: config_1.epochLength,
            attestingFee: attestingFee
        };
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths, _settings);
        console.log('User sign up');
        userId = (0, crypto_1.genIdentity)();
        userCommitment = (0, crypto_1.genIdentityCommitment)(userId);
        const tree = new crypto_1.IncrementalMerkleTree(config_1.circuitGlobalStateTreeDepth, ZERO_VALUE, 2);
        const stateRoot = (0, crypto_1.genRandomSalt)();
        const hashedStateLeaf = (0, crypto_1.hashLeftRight)(userCommitment, stateRoot);
        tree.insert(BigInt(hashedStateLeaf.toString()));
        const leafIndex = 0;
        let tx = await unirepContract.userSignUp(userCommitment);
        let receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        console.log('Attester sign up');
        attester = accounts[1];
        attesterAddress = await attester.getAddress();
        unirepContractCalledByAttester = await hardhat_1.ethers.getContractAt(src_1.Unirep.abi, unirepContract.address, attester);
        tx = await unirepContractCalledByAttester.attesterSignUp();
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        attesterId = await unirepContract.attesters(attesterAddress);
        let epoch = (await unirepContract.currentEpoch()).toNumber();
        let nonce = 1;
        let circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userId, tree, leafIndex, stateRoot, epoch, nonce);
        let input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
        let epochKey = input.epochKey;
        // Submit epoch key proof
        tx = await unirepContract.submitEpochKeyProof(input);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        let proofNullifier = await unirepContract.hashEpochKeyProof(input);
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier);
        const senderPfIdx = 0;
        // Submit attestations
        const attestationNum = 6;
        for (let i = 0; i < attestationNum; i++) {
            let attestation = new utils_1.Attestation(BigInt(attesterId.toString()), BigInt(i), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
            tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee });
            receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
        }
    });
    it('premature epoch transition should fail', async () => {
        await (0, chai_1.expect)(unirepContract.beginEpochTransition()).to.be.revertedWith('Unirep: epoch not yet ended');
    });
    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch();
        // Fast-forward epochLength of seconds
        await hardhat_1.ethers.provider.send("evm_increaseTime", [config_1.epochLength]);
        // Assert no epoch transition compensation is dispensed to volunteer
        (0, chai_1.expect)(await unirepContract.epochTransitionCompensation(attesterAddress)).to.be.equal(0);
        // Begin epoch transition 
        let tx = await unirepContractCalledByAttester.beginEpochTransition();
        let receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        console.log("Gas cost of sealing one epoch key:", receipt.gasUsed.toString());
        // Verify compensation to the volunteer increased
        (0, chai_1.expect)(await unirepContract.epochTransitionCompensation(attesterAddress)).to.gt(0);
        // Complete epoch transition
        (0, chai_1.expect)(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1));
        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime();
        (0, chai_1.expect)(latestEpochTransitionTime).equal((await hardhat_1.ethers.provider.getBlock(receipt.blockNumber)).timestamp);
        let epoch_ = await unirepContract.currentEpoch();
        (0, chai_1.expect)(epoch_).equal(epoch.add(1));
    });
    it('bootstrap user state and reputations and bootstrap global state tree', async () => {
        const results = await (0, utils_1.bootstrapRandomUSTree)();
        userStateTree = results.userStateTree;
        // Global state tree
        GSTree = new crypto_1.IncrementalMerkleTree(config_1.circuitGlobalStateTreeDepth, utils_1.GSTZERO_VALUE, 2);
        const commitment = (0, crypto_1.genIdentityCommitment)(userId);
        const hashedLeaf = (0, crypto_1.hashLeftRight)(commitment, userStateTree.getRootHash());
        GSTree.insert(hashedLeaf);
        leafIndex = 0;
    });
    it('start user state transition should succeed', async () => {
        fromEpoch = 1;
        const nonce = 0;
        const circuitInputs = (0, utils_1.genStartTransitionCircuitInput)(userId, GSTree, leafIndex, userStateTree.getRootHash(), fromEpoch, nonce);
        const { blindedUserState, blindedHashChain, GSTRoot, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.startTransition, circuitInputs);
        const isProofValid = await unirepContract.verifyStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof);
        (0, chai_1.expect)(isProofValid).to.be.true;
        const tx = await unirepContract.startUserStateTransition(blindedUserState, blindedHashChain, GSTRoot, proof);
        console.log('start transition');
        console.log('start blinded user state: ', blindedUserState);
        console.log('start blinded hash chain: ', blindedHashChain);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status, 'Submit user state transition proof failed').to.equal(1);
        console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString());
        let proofNullifier = await unirepContract.hashStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof);
        let proofIndex = await unirepContract.getProofIndex(proofNullifier);
        proofIndexes.push(BigInt(proofIndex));
    });
    it('submit process attestations proofs should succeed', async () => {
        for (let i = 0; i < config_1.numEpochKeyNoncePerEpoch; i++) {
            const prooftNum = Math.ceil(Math.random() * 5);
            let toNonce = i;
            for (let j = 0; j < prooftNum; j++) {
                // If it is the end of attestations of the epoch key, then the next epoch key nonce increased by one
                if (j == (prooftNum - 1))
                    toNonce = i + 1;
                // If it it the maximum epoch key nonce, then the next epoch key nonce should not increase
                if (i == (config_1.numEpochKeyNoncePerEpoch - 1))
                    toNonce = i;
                const { circuitInputs } = await (0, utils_1.genProcessAttestationsCircuitInput)(userId, fromEpoch, BigInt(i), BigInt(toNonce));
                const { outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.processAttestations, circuitInputs);
                const tx = await unirepContract.processAttestations(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
                console.log('input blinded user state: ', inputBlindedUserState);
                console.log('output blinded user state: ', outputBlindedUserState);
                console.log('output blinded hash chain: ', outputBlindedHashChain);
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status, 'Submit process attestations proof failed').to.equal(1);
                console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString());
                const proofNullifier = await unirepContract.hashProcessAttestationsProof(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
                const proofIndex = await unirepContract.getProofIndex(proofNullifier);
                proofIndexes.push(BigInt(proofIndex));
            }
        }
    });
    it('submit user state transition proofs should succeed', async () => {
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(userId, fromEpoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        const tx = await unirepContract.updateUserStateRoot(input, proofIndexes);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status, 'Submit user state transition proof failed').to.equal(1);
        console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString());
    });
    it('epoch transition with no attestations and epoch keys should also succeed', async () => {
        let epoch = await unirepContract.currentEpoch();
        // Fast-forward epochLength of seconds
        await hardhat_1.ethers.provider.send("evm_increaseTime", [config_1.epochLength]);
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition();
        let receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime();
        (0, chai_1.expect)(latestEpochTransitionTime).equal((await hardhat_1.ethers.provider.getBlock(receipt.blockNumber)).timestamp);
        let epoch_ = await unirepContract.currentEpoch();
        (0, chai_1.expect)(epoch_).equal(epoch.add(1));
    });
    it('collecting epoch transition compensation should succeed', async () => {
        const compensation = await unirepContract.epochTransitionCompensation(attesterAddress);
        (0, chai_1.expect)(compensation).to.gt(0);
        // Set gas price to 0 so attester will not be charged transaction fee
        await (0, chai_1.expect)(() => unirepContractCalledByAttester.collectEpochTransitionCompensation())
            .to.changeEtherBalance(attester, compensation);
        (0, chai_1.expect)(await unirepContract.epochTransitionCompensation(attesterAddress)).to.equal(0);
    });
});
