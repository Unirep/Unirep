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
describe('Attesting', () => {
    let unirepContract;
    let accounts;
    let userId, userCommitment;
    let attester, attesterAddress, attesterId, unirepContractCalledByAttester;
    const signedUpInLeaf = 1;
    const indexes = [];
    const epoch = 1;
    const nonce = 0;
    let epochKey;
    let proofIndex;
    let tree;
    let stateRoot = (0, crypto_1.genRandomSalt)();
    let hashedStateLeaf;
    const leafIndex = 0;
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
        tree = new crypto_1.IncrementalMerkleTree(config_1.circuitGlobalStateTreeDepth, utils_1.GSTZERO_VALUE, 2);
        stateRoot = (0, crypto_1.genRandomSalt)();
        hashedStateLeaf = (0, crypto_1.hashLeftRight)(userCommitment, stateRoot);
        tree.insert(BigInt(hashedStateLeaf.toString()));
    });
    it('submit an epoch key proof should succeed', async () => {
        const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userId, tree, leafIndex, stateRoot, epoch, nonce);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
        epochKey = input.epochKey;
        const tx = await unirepContract.submitEpochKeyProof(input);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const proofNullifier = await unirepContract.hashEpochKeyProof(input);
        (0, chai_1.expect)(input.hash()).equal(proofNullifier.toString());
        proofIndex = await unirepContract.getProofIndex(input.hash());
        (0, chai_1.expect)(Number(proofIndex)).greaterThan(0);
    });
    it('submit attestation should succeed', async () => {
        let attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        const senderPfIdx = 0;
        const tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex, senderPfIdx, { value: config_1.attestingFee });
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
    });
    it('spend reputation should succeed', async () => {
        const { reputationRecords } = await (0, utils_1.bootstrapRandomUSTree)();
        const circuitInputs = await (0, utils_1.genReputationCircuitInput)(userId, epoch, nonce, reputationRecords, BigInt(attesterId));
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveReputation, circuitInputs);
        const tx = await unirepContractCalledByAttester.spendReputation(input, { value: config_1.attestingFee });
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const proofNullifier = await unirepContract.hashReputationProof(input);
        (0, chai_1.expect)(input.hash()).equal(proofNullifier.toString());
        proofIndex = await unirepContract.getProofIndex(input.hash());
        (0, chai_1.expect)(Number(proofIndex)).greaterThan(0);
    });
    it('submit get airdrop should succeed', async () => {
        const { reputationRecords } = await (0, utils_1.bootstrapRandomUSTree)();
        const circuitInputs = await (0, utils_1.genProveSignUpCircuitInput)(userId, epoch, reputationRecords, BigInt(attesterId));
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.proveUserSignUp, circuitInputs);
        let tx = await unirepContractCalledByAttester.airdropEpochKey(input, { value: config_1.attestingFee });
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const proofNullifier = await unirepContract.hashSignUpProof(input);
        (0, chai_1.expect)(input.hash()).equal(proofNullifier.toString());
        proofIndex = await unirepContract.getProofIndex(input.hash());
        (0, chai_1.expect)(Number(proofIndex)).greaterThan(0);
    });
    it('submit start user state transition should success', async () => {
        const circuitInputs = (0, utils_1.genStartTransitionCircuitInput)(userId, tree, leafIndex, stateRoot, epoch, nonce);
        const { blindedUserState, blindedHashChain, GSTRoot, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.startTransition, circuitInputs);
        const tx = await unirepContract.startUserStateTransition(blindedUserState, blindedHashChain, GSTRoot, proof);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const proofNullifier = await unirepContract.hashStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof);
        const computedHash = (0, src_1.computeStartTransitionProofHash)(blindedUserState, blindedHashChain, GSTRoot, proof);
        (0, chai_1.expect)(computedHash).equal(proofNullifier.toString());
        proofIndex = await unirepContract.getProofIndex(computedHash);
        (0, chai_1.expect)(Number(proofIndex)).greaterThan(0);
    });
    it('submit process attestation proofs should success', async () => {
        const { circuitInputs } = await (0, utils_1.genProcessAttestationsCircuitInput)(userId, BigInt(epoch), BigInt(nonce), BigInt(nonce));
        const { outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof } = await (0, utils_1.genInputForContract)(circuits_1.Circuit.processAttestations, circuitInputs);
        const tx = await unirepContract.processAttestations(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
        const receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const proofNullifier = await unirepContract.hashProcessAttestationsProof(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
        const computedHash = (0, src_1.computeProcessAttestationsProofHash)(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof);
        (0, chai_1.expect)(computedHash).equal(proofNullifier.toString());
        proofIndex = await unirepContract.getProofIndex(computedHash);
        (0, chai_1.expect)(Number(proofIndex)).greaterThan(0);
    });
    it('submit user state transition proofs should success', async () => {
        // Fast-forward epochLength of seconds
        await hardhat_1.ethers.provider.send("evm_increaseTime", [config_1.epochLength]);
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition();
        let receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const circuitInputs = await (0, utils_1.genUserStateTransitionCircuitInput)(userId, epoch);
        const input = await (0, utils_1.genInputForContract)(circuits_1.Circuit.userStateTransition, circuitInputs);
        tx = await unirepContract.updateUserStateRoot(input, indexes);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const proofNullifier = await unirepContract.hashUserStateTransitionProof(input);
        (0, chai_1.expect)(input.hash()).equal(proofNullifier.toString());
        proofIndex = await unirepContract.getProofIndex(input.hash());
        (0, chai_1.expect)(Number(proofIndex)).greaterThan(0);
    });
    it('submit attestation events should match and correctly emitted', async () => {
        var _a, _b, _c, _d, _e, _f, _g;
        const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
        const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter);
        // compute hash chain of valid epoch key
        for (let i = 0; i < attestationSubmittedEvents.length; i++) {
            const proofIndex = (_a = attestationSubmittedEvents[i].args) === null || _a === void 0 ? void 0 : _a._proofIndex;
            const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof(proofIndex);
            const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter);
            const repProofFilter = unirepContract.filters.IndexedReputationProof(proofIndex);
            const repProofEvent = await unirepContract.queryFilter(repProofFilter);
            const signUpProofFilter = unirepContract.filters.IndexedUserSignedUpProof(proofIndex);
            const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter);
            if (epochKeyProofEvent.length == 1) {
                console.log('epoch key proof event');
                const args = (_c = (_b = epochKeyProofEvent[0]) === null || _b === void 0 ? void 0 : _b.args) === null || _c === void 0 ? void 0 : _c._proof;
                const isValid = await unirepContract.verifyEpochKeyValidity(args);
                (0, chai_1.expect)(isValid).equal(true);
            }
            else if (repProofEvent.length == 1) {
                console.log('reputation proof event');
                const args = (_e = (_d = repProofEvent[0]) === null || _d === void 0 ? void 0 : _d.args) === null || _e === void 0 ? void 0 : _e._proof;
                (0, chai_1.expect)(args === null || args === void 0 ? void 0 : args.repNullifiers.length).to.equal(config_1.maxReputationBudget);
                const isValid = await unirepContract.verifyReputation(args);
                (0, chai_1.expect)(isValid).equal(true);
            }
            else if (signUpProofEvent.length == 1) {
                console.log('sign up proof event');
                const args = (_g = (_f = signUpProofEvent[0]) === null || _f === void 0 ? void 0 : _f.args) === null || _g === void 0 ? void 0 : _g._proof;
                const isValid = await unirepContract.verifyUserSignUp(args);
                (0, chai_1.expect)(isValid).equal(true);
            }
        }
    });
    it('user state transition proof should match and correctly emitted', async () => {
        var _a, _b, _c, _d;
        const startTransitionFilter = unirepContract.filters.IndexedStartedTransitionProof();
        const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter);
        (0, chai_1.expect)(startTransitionEvents.length).to.equal(1);
        let args = (_a = startTransitionEvents[0]) === null || _a === void 0 ? void 0 : _a.args;
        let isValid = await unirepContract.verifyStartTransitionProof(args === null || args === void 0 ? void 0 : args._blindedUserState, args === null || args === void 0 ? void 0 : args._blindedHashChain, args === null || args === void 0 ? void 0 : args._globalStateTree, args === null || args === void 0 ? void 0 : args._proof);
        (0, chai_1.expect)(isValid).equal(true);
        const processAttestationFilter = unirepContract.filters.IndexedProcessedAttestationsProof();
        const processAttestationEvents = await unirepContract.queryFilter(processAttestationFilter);
        (0, chai_1.expect)(processAttestationEvents.length).to.equal(1);
        args = (_b = processAttestationEvents[0]) === null || _b === void 0 ? void 0 : _b.args;
        isValid = await unirepContract.verifyProcessAttestationProof(args === null || args === void 0 ? void 0 : args._outputBlindedUserState, args === null || args === void 0 ? void 0 : args._outputBlindedHashChain, args === null || args === void 0 ? void 0 : args._inputBlindedUserState, args === null || args === void 0 ? void 0 : args._proof);
        (0, chai_1.expect)(isValid).equal(true);
        const userStateTransitionFilter = unirepContract.filters.IndexedUserStateTransitionProof();
        const userStateTransitionEvents = await unirepContract.queryFilter(userStateTransitionFilter);
        (0, chai_1.expect)(userStateTransitionEvents.length).to.equal(1);
        args = (_d = (_c = userStateTransitionEvents[0]) === null || _c === void 0 ? void 0 : _c.args) === null || _d === void 0 ? void 0 : _d._proof;
        isValid = await unirepContract.verifyUserStateTransition(args);
        (0, chai_1.expect)(isValid).equal(true);
    });
});
