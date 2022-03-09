"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const ethers_1 = require("ethers");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const config_1 = require("../config");
const src_1 = require("../src");
const utils_1 = require("./utils");
describe('Signup', () => {
    const testMaxUser = 5;
    let unirepContract;
    let accounts;
    let signedUpUsers = 0;
    let signedUpAttesters = 0;
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        // Set maxUsers to testMaxUser
        const _settings = {
            maxUsers: testMaxUser,
            maxAttesters: testMaxUser,
            numEpochKeyNoncePerEpoch: config_1.numEpochKeyNoncePerEpoch,
            maxReputationBudget: config_1.maxReputationBudget,
            epochLength: config_1.epochLength,
            attestingFee: config_1.attestingFee
        };
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths, _settings);
    });
    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee();
        (0, chai_1.expect)(config_1.attestingFee).equal(attestingFee_);
        const epochLength_ = await unirepContract.epochLength();
        (0, chai_1.expect)(config_1.epochLength).equal(epochLength_);
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch();
        (0, chai_1.expect)(config_1.numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_);
        const maxUsers_ = await unirepContract.maxUsers();
        (0, chai_1.expect)(testMaxUser).equal(maxUsers_);
        const treeDepths_ = await unirepContract.treeDepths();
        (0, chai_1.expect)(config_1.epochTreeDepth).equal(treeDepths_.epochTreeDepth);
        (0, chai_1.expect)(config_1.globalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth);
        (0, chai_1.expect)(config_1.userStateTreeDepth).equal(treeDepths_.userStateTreeDepth);
    });
    describe('User sign-ups', () => {
        const id = (0, crypto_1.genIdentity)();
        const commitment = (0, crypto_1.genIdentityCommitment)(id);
        it('sign up should succeed', async () => {
            const tx = await unirepContract.userSignUp(commitment);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            signedUpUsers++;
            const numUserSignUps_ = await unirepContract.numUserSignUps();
            (0, chai_1.expect)(signedUpUsers).equal(numUserSignUps_);
        });
        it('double sign up should fail', async () => {
            await (0, chai_1.expect)(unirepContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: the user has already signed up');
        });
        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < testMaxUser; i++) {
                let tx = await unirepContract.userSignUp((0, crypto_1.genIdentityCommitment)((0, crypto_1.genIdentity)()));
                let receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).equal(1);
                signedUpUsers++;
                const numUserSignUps_ = await unirepContract.numUserSignUps();
                (0, chai_1.expect)(signedUpUsers).equal(numUserSignUps_);
            }
            await (0, chai_1.expect)(unirepContract.userSignUp((0, crypto_1.genIdentityCommitment)((0, crypto_1.genIdentity)())))
                .to.be.revertedWith('Unirep: maximum number of user signups reached');
        });
    });
    describe('Attester sign-ups', () => {
        let attester;
        let attesterAddress;
        let attester2;
        let attester2Address;
        let attester2Sig;
        let unirepContractCalledByAttester;
        it('sign up should succeed', async () => {
            attester = accounts[1];
            attesterAddress = await attester.getAddress();
            unirepContractCalledByAttester = unirepContract.connect(attester);
            const tx = await unirepContractCalledByAttester.attesterSignUp();
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            signedUpAttesters++;
            const attesterId = await unirepContract.attesters(attesterAddress);
            (0, chai_1.expect)(signedUpAttesters).equal(attesterId);
            const nextAttesterId_ = await unirepContract.nextAttesterId();
            // nextAttesterId starts with 1 so now it should be 2
            (0, chai_1.expect)(signedUpAttesters + 1).equal(nextAttesterId_);
        });
        it('sign up via relayer should succeed', async () => {
            let relayer = accounts[0];
            unirepContract.connect(relayer);
            attester2 = accounts[2];
            attester2Address = await attester2.getAddress();
            let message = ethers_1.ethers.utils.solidityKeccak256(["address", "address"], [attester2Address, unirepContract.address]);
            attester2Sig = await attester2.signMessage(ethers_1.ethers.utils.arrayify(message));
            const tx = await unirepContract.attesterSignUpViaRelayer(attester2Address, attester2Sig);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            signedUpAttesters++;
            const attesterId = await unirepContract.attesters(attester2Address);
            (0, chai_1.expect)(signedUpAttesters).equal(attesterId);
            const nextAttesterId_ = await unirepContract.nextAttesterId();
            (0, chai_1.expect)(signedUpAttesters + 1).equal(nextAttesterId_);
        });
        it('sign up with invalid signature should fail', async () => {
            let attester3 = accounts[3];
            let attester3Address = await attester3.getAddress();
            await (0, chai_1.expect)(unirepContract.attesterSignUpViaRelayer(attester3Address, attester2Sig))
                .to.be.revertedWith('Unirep: invalid attester sign up signature');
        });
        it('double sign up should fail', async () => {
            await (0, chai_1.expect)(unirepContractCalledByAttester.attesterSignUp())
                .to.be.revertedWith('Unirep: attester has already signed up');
            await (0, chai_1.expect)(unirepContract.attesterSignUpViaRelayer(attester2Address, attester2Sig))
                .to.be.revertedWith('Unirep: attester has already signed up');
        });
        it('sign up should fail if max capacity reached', async () => {
            for (let i = 3; i < testMaxUser; i++) {
                attester = accounts[i];
                attesterAddress = await attester.getAddress();
                unirepContractCalledByAttester = unirepContract.connect(attester);
                const tx = await unirepContractCalledByAttester.attesterSignUp();
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).equal(1);
                signedUpAttesters++;
                const attesterId = await unirepContract.attesters(attesterAddress);
                (0, chai_1.expect)(signedUpAttesters).equal(attesterId);
                const nextAttesterId_ = await unirepContract.nextAttesterId();
                (0, chai_1.expect)(signedUpAttesters + 1).equal(nextAttesterId_);
            }
            attester = accounts[5];
            attesterAddress = await attester.getAddress();
            unirepContractCalledByAttester = unirepContract.connect(attester);
            await (0, chai_1.expect)(unirepContractCalledByAttester.attesterSignUp())
                .to.be.revertedWith('Unirep: maximum number of attester signups reached');
        });
    });
});
