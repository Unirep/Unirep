"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const config_1 = require("../config");
const utils_1 = require("./utils");
const src_1 = require("../src");
describe('Airdrop', function () {
    this.timeout(100000);
    let unirepContract;
    let accounts;
    let numUsers = 0;
    let attesterAddress, unirepContractCalledByAttester;
    const airdropPosRep = 20;
    const epkNonce = 0;
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        const _settings = {
            maxUsers: config_1.maxUsers,
            maxAttesters: config_1.maxAttesters,
            numEpochKeyNoncePerEpoch: config_1.numEpochKeyNoncePerEpoch,
            maxReputationBudget: config_1.maxReputationBudget,
            epochLength: config_1.epochLength,
            attestingFee: config_1.attestingFee
        };
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths, _settings);
    });
    describe('Attesters set airdrop', () => {
        it('attester signs up and attester sets airdrop amount should succeed', async () => {
            console.log('Attesters sign up');
            for (let i = 0; i < 2; i++) {
                unirepContractCalledByAttester = unirepContract.connect(accounts[i]);
                const tx = await unirepContractCalledByAttester.attesterSignUp();
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).equal(1);
            }
            console.log('attesters set airdrop amount');
            unirepContractCalledByAttester = unirepContract.connect(accounts[0]);
            attesterAddress = await accounts[0].getAddress();
            const tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const airdroppedAmount = await unirepContractCalledByAttester.airdropAmount(attesterAddress);
            (0, chai_1.expect)(airdroppedAmount.toNumber()).equal(airdropPosRep);
        });
        it('non-signup attester cannot set airdrop amount', async () => {
            unirepContractCalledByAttester = unirepContract.connect(accounts[2]);
            await (0, chai_1.expect)(unirepContractCalledByAttester.setAirdropAmount(airdropPosRep))
                .to.be.revertedWith('Unirep: attester has not signed up yet');
        });
        it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async () => {
            console.log('User sign up');
            const userId = (0, crypto_1.genIdentity)();
            const userCommitment = (0, crypto_1.genIdentityCommitment)(userId);
            unirepContractCalledByAttester = unirepContract.connect(accounts[1]);
            let tx = await unirepContractCalledByAttester.userSignUp(userCommitment);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const signUpFilter = unirepContract.filters.UserSignedUp();
            const signUpEvents = await unirepContract.queryFilter(signUpFilter);
            const commitment_ = signUpEvents[numUsers].args._identityCommitment;
            (0, chai_1.expect)(commitment_).equal(userCommitment);
            numUsers++;
            // user can prove airdrop pos rep
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber();
            const reputationRecords = {};
            let attesterId_;
            for (const event of signUpEvents) {
                attesterId_ = event.args._attesterId.toNumber();
                reputationRecords[attesterId_] = new utils_1.Reputation(BigInt(event.args._airdropAmount), BigInt(0), BigInt(0), BigInt(0) // airdrop amount == 0
                );
            }
            const minPosRep = 19;
            const circuitInputs = await (0, utils_1.genReputationCircuitInput)(userId, currentEpoch, epkNonce, reputationRecords, attesterId_, undefined, minPosRep);
            const isValid = await (0, utils_1.genProofAndVerify)(circuits_1.Circuit.proveReputation, circuitInputs);
            (0, chai_1.expect)(isValid, 'Verify reputation proof off-chain failed').to.be.false;
        });
        it('user signs up through a non-signed up attester should succeed and gets no airdrop', async () => {
            console.log('User sign up');
            const userId = (0, crypto_1.genIdentity)();
            const userCommitment = (0, crypto_1.genIdentityCommitment)(userId);
            unirepContractCalledByAttester = unirepContract.connect(accounts[2]);
            let tx = await unirepContractCalledByAttester.userSignUp(userCommitment);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const signUpFilter = unirepContract.filters.UserSignedUp();
            const signUpEvents = await unirepContract.queryFilter(signUpFilter);
            const commitment_ = signUpEvents[numUsers].args._identityCommitment;
            (0, chai_1.expect)(commitment_).equal(userCommitment);
            numUsers++;
        });
    });
    describe('Users get airdrop', () => {
        console.log('User sign up');
        const userId = (0, crypto_1.genIdentity)();
        const userCommitment = (0, crypto_1.genIdentityCommitment)(userId);
        let currentEpoch;
        let reputationRecords = {};
        let attesterId_;
        it('user signs up through attester should get airdrop pos rep', async () => {
            let tx = await unirepContract.userSignUp(userCommitment);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const signUpFilter = unirepContract.filters.UserSignedUp();
            const signUpEvents = await unirepContract.queryFilter(signUpFilter);
            const commitment_ = signUpEvents[numUsers].args._identityCommitment;
            (0, chai_1.expect)(commitment_).equal(userCommitment);
            numUsers++;
            currentEpoch = (await unirepContract.currentEpoch()).toNumber();
            reputationRecords = {};
            for (const event of signUpEvents) {
                attesterId_ = event.args._attesterId.toNumber();
                reputationRecords[attesterId_] = new utils_1.Reputation(BigInt(event.args._airdropAmount), BigInt(0), BigInt(0), BigInt(1) // airdrop amount != 0
                );
            }
        });
        it('user can prove airdrop pos rep', async () => {
            const minPosRep = 19;
            const repProofCircuitInputs = await (0, utils_1.genReputationCircuitInput)(userId, currentEpoch, epkNonce, reputationRecords, attesterId_, undefined, minPosRep);
            const isRepProofValid = await (0, utils_1.genProofAndVerify)(circuits_1.Circuit.proveReputation, repProofCircuitInputs);
            (0, chai_1.expect)(isRepProofValid, 'Verify reputation proof off-chain failed').to.be.true;
        });
        it('user can prove sign up flag', async () => {
            const signUpCircuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, currentEpoch, reputationRecords, attesterId_);
            const isSignUpProofValid = await (0, utils_1.genProofAndVerify)(circuits_1.Circuit.proveUserSignUp, signUpCircuitInputs);
            (0, chai_1.expect)(isSignUpProofValid, 'Verify user sign up proof off-chain failed').to.be.true;
        });
        it('user can use sign up proof to get airdrop (from the attester)', async () => {
            const signUpCircuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, currentEpoch, reputationRecords, attesterId_);
            const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, signUpCircuitInputs);
            unirepContractCalledByAttester = unirepContract.connect(accounts[0]);
            const tx = await unirepContractCalledByAttester.airdropEpochKey(input, { value: config_1.attestingFee });
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const pfIdx = await unirepContract.getProofIndex(input.hash());
            (0, chai_1.expect)(Number(pfIdx)).not.eq(0);
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(input))
                .to.be.revertedWith('Unirep: the proof has been submitted before');
        });
        it('get airdrop through a non-signup attester should fail', async () => {
            const signUpCircuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, currentEpoch, reputationRecords, attesterId_);
            const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, signUpCircuitInputs);
            unirepContractCalledByAttester = unirepContract.connect(accounts[2]);
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(input, { value: config_1.attestingFee }))
                .to.be.revertedWith('Unirep: attester has not signed up yet');
        });
        it('get airdrop through a wrong attester should fail', async () => {
            const signUpCircuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, currentEpoch, reputationRecords, attesterId_);
            const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, signUpCircuitInputs);
            unirepContractCalledByAttester = unirepContract.connect(accounts[1]);
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(input, { value: config_1.attestingFee }))
                .to.be.revertedWith('Unirep: mismatched attesterId');
        });
        it('get airdrop through a wrong attester should fail', async () => {
            const signUpCircuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, currentEpoch, reputationRecords, attesterId_);
            const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, signUpCircuitInputs);
            unirepContractCalledByAttester = unirepContract.connect(accounts[0]);
            const attestingFee_ = await unirepContract.attestingFee();
            const wrongAttestingFee = attestingFee_.add(2);
            (0, chai_1.expect)(wrongAttestingFee).not.equal(attestingFee_);
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(input, { value: wrongAttestingFee }))
                .to.be.revertedWith('Unirep: no attesting fee or incorrect amount');
        });
        it('get airdrop through a wrong epoch should fail', async () => {
            const wrongEpoch = currentEpoch + 1;
            const signUpCircuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, wrongEpoch, reputationRecords, attesterId_);
            const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, signUpCircuitInputs);
            unirepContractCalledByAttester = unirepContract.connect(accounts[0]);
            const currentEpoch_ = await unirepContract.currentEpoch();
            (0, chai_1.expect)(wrongEpoch).not.equal(currentEpoch_);
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(input, { value: config_1.attestingFee }))
                .to.be.revertedWith('Unirep: submit an airdrop proof with incorrect epoch');
        });
        it('submit an invalid epoch key should fail', async () => {
            const signUpCircuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, currentEpoch, reputationRecords, attesterId_);
            const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, signUpCircuitInputs);
            unirepContractCalledByAttester = unirepContract.connect(accounts[0]);
            input.epochKey = (0, crypto_1.genRandomSalt)();
            await (0, chai_1.expect)(unirepContractCalledByAttester.airdropEpochKey(input, { value: config_1.attestingFee }))
                .to.be.revertedWith('Unirep: invalid epoch key range');
        });
    });
});
