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
describe('Attesting', () => {
    let unirepContract;
    let accounts;
    let userId, userCommitment;
    let attester, attesterAddress, attesterId, unirepContractCalledByAttester;
    let attester2, unirepContractCalledByAttester2;
    const signedUpInLeaf = 1;
    const proof = [];
    for (let i = 0; i < 8; i++) {
        proof.push('0');
    }
    const epoch = 1;
    const nonce = 0;
    const epochKey = (0, utils_1.genEpochKey)((0, crypto_1.genRandomSalt)(), epoch, nonce);
    const publicSignals = [(0, crypto_1.genRandomSalt)(), epoch, epochKey];
    const epochKeyProof = new src_1.EpochKeyProof(publicSignals, (0, circuits_1.formatProofForSnarkjsVerification)(proof));
    let epochKeyProofIndex;
    const senderPfIdx = 0;
    const attestingFee = ethers_1.ethers.utils.parseEther("0.1");
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
        let tx = await unirepContract.userSignUp(userCommitment);
        let receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        console.log('Attesters sign up');
        attester = accounts[1];
        attesterAddress = await attester.getAddress();
        unirepContractCalledByAttester = unirepContract.connect(attester);
        tx = await unirepContractCalledByAttester.attesterSignUp();
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        attesterId = await unirepContract.attesters(attesterAddress);
        // Sign up another attester
        attester2 = accounts[2];
        unirepContractCalledByAttester2 = unirepContract.connect(attester2);
        tx = await unirepContractCalledByAttester2.attesterSignUp();
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
    });
    it('submit an epoch key proof should succeed', async () => {
        const tx = await unirepContract.submitEpochKeyProof(epochKeyProof);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof);
        (0, chai_1.expect)(receipt.status).equal(1);
        const _proofNullifier = epochKeyProof.hash();
        (0, chai_1.expect)(_proofNullifier).equal(proofNullifier);
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier);
        (0, chai_1.expect)(epochKeyProof).not.equal(null);
    });
    it('submit an epoch key proof again should fail', async () => {
        await (0, chai_1.expect)(unirepContract.submitEpochKeyProof(epochKeyProof))
            .to.be.revertedWith('Unirep: the proof has been submitted before');
    });
    it('submit an epoch key proof with wrong epoch should fail', async () => {
        const wrongEpochKeyProof = [(0, crypto_1.genRandomSalt)(), epoch + 1, epochKey, proof];
        await (0, chai_1.expect)(unirepContract.submitEpochKeyProof(wrongEpochKeyProof))
            .to.be.revertedWith('Unirep: submit an epoch key proof with incorrect epoch');
    });
    it('submit an invalid epoch key should fail', async () => {
        const wrongEpochKey = (0, crypto_1.genRandomSalt)();
        const wrongEpochKeyProof = [(0, crypto_1.genRandomSalt)(), epoch, wrongEpochKey, proof];
        await (0, chai_1.expect)(unirepContract.submitEpochKeyProof(wrongEpochKeyProof))
            .to.be.revertedWith('Unirep: invalid epoch key range');
    });
    it('submit attestation should succeed', async () => {
        let epoch = await unirepContract.currentEpoch();
        let nonce = 0;
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        let attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        // Assert no attesting fees are collected yet
        (0, chai_1.expect)(await unirepContract.collectedAttestingFee()).to.be.equal(0);
        const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee });
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // Verify attesting fee is collected
        (0, chai_1.expect)(await unirepContract.collectedAttestingFee()).to.be.equal(attestingFee);
    });
    it('attest to same epoch key again should succeed', async () => {
        let epoch = await unirepContract.currentEpoch();
        let nonce = 0;
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        let attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(0), BigInt(1000), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee });
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
    });
    it('attestation with incorrect attesterId should fail', async () => {
        let epoch = await unirepContract.currentEpoch();
        // Increment nonce to get different epoch key
        let nonce = 1;
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        let attestation = new utils_1.Attestation(BigInt(999), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: mismatched attesterId');
    });
    it('attestation with invalid repuation should fail', async () => {
        let epoch = await unirepContract.currentEpoch();
        // Increment nonce to get different epoch key
        let nonce = 1;
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        let attestation = new utils_1.Attestation(BigInt(attesterId), crypto_1.SNARK_FIELD_SIZE, BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: invalid attestation posRep');
        attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), crypto_1.SNARK_FIELD_SIZE, (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: invalid attestation negRep');
        attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), crypto_1.SNARK_FIELD_SIZE, BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: invalid attestation graffiti');
        attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)());
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: invalid sign up flag');
    });
    it('attestation with zero proof index should fail', async () => {
        let epoch = await unirepContract.currentEpoch();
        // Increment nonce to get different epoch key
        let nonce = 1;
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        const zeroEpochKeyProofIndex = 0;
        let attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, zeroEpochKeyProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: invalid proof index');
    });
    it('attestation with non-existed proof index should fail', async () => {
        let epoch = await unirepContract.currentEpoch();
        // Increment nonce to get different epoch key
        let nonce = 1;
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        const nonExistedProofIndex = 5;
        let attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, nonExistedProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: invalid proof index');
    });
    it('submit attestation with incorrect fee amount should fail', async () => {
        let epoch = await unirepContract.currentEpoch();
        // Increment nonce to get different epoch key
        let nonce = 1;
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        let attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx))
            .to.be.revertedWith('Unirep: no attesting fee or incorrect amount');
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: (attestingFee.sub(1)) })).to.be.revertedWith('Unirep: no attesting fee or incorrect amount');
        await (0, chai_1.expect)(unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: (attestingFee.add(1)) })).to.be.revertedWith('Unirep: no attesting fee or incorrect amount');
    });
    it('attestation from unregistered attester should fail', async () => {
        let nonAttester = accounts[5];
        let nonAttesterAddress = await nonAttester.getAddress();
        let nonAttesterId = await unirepContract.attesters(nonAttesterAddress);
        (0, chai_1.expect)((0).toString()).equal(nonAttesterId.toString());
        let unirepContractCalledByNonAttester = await hardhat_1.ethers.getContractAt(src_1.Unirep.abi, unirepContract.address, nonAttester);
        let epoch = await unirepContract.currentEpoch();
        let nonce = 0;
        let epochKey = (0, utils_1.genEpochKey)(userId.identityNullifier, epoch, nonce);
        let attestation = new utils_1.Attestation(BigInt(nonAttesterId), BigInt(0), BigInt(1), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        await (0, chai_1.expect)(unirepContractCalledByNonAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: attestingFee })).to.be.revertedWith('Unirep: attester has not signed up yet');
    });
    it('burn collected attesting fee should work', async () => {
        (0, chai_1.expect)(await unirepContract.collectedAttestingFee()).to.be.equal(attestingFee.mul(2));
        await unirepContractCalledByAttester.burnAttestingFee();
        (0, chai_1.expect)(await unirepContract.collectedAttestingFee()).to.be.equal(0);
        (0, chai_1.expect)(await hardhat_1.ethers.provider.getBalance(unirepContract.address)).to.equal(0);
    });
});
