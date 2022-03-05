"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const circuits_1 = require("@unirep/circuits");
const crypto_1 = require("@unirep/crypto");
const core_1 = require("../../core");
const utils_1 = require("../utils");
describe('User State', async function () {
    this.timeout(500000);
    let unirepState;
    let userState;
    const setting = {
        globalStateTreeDepth: core_1.circuitGlobalStateTreeDepth,
        userStateTreeDepth: core_1.circuitUserStateTreeDepth,
        epochTreeDepth: core_1.circuitEpochTreeDepth,
        attestingFee: core_1.attestingFee,
        epochLength: core_1.epochLength,
        numEpochKeyNoncePerEpoch: core_1.numEpochKeyNoncePerEpoch,
        maxReputationBudget: core_1.maxReputationBudget,
    };
    const user = (0, crypto_1.genIdentity)();
    const epochKeys = [];
    const maxUsers = (2 ** setting.globalStateTreeDepth) - 1;
    const userNum = Math.ceil(Math.random() * maxUsers);
    let epoch = 1;
    const signedUpAttesterId = Math.ceil(Math.random() * 10);
    const signedUpAirdrop = Math.ceil(Math.random() * 10);
    const attestationsToEpochKey = {};
    before(async () => {
        unirepState = new core_1.UnirepState(setting);
        userState = new core_1.UserState(unirepState, user);
    });
    describe('Users sign up', async () => {
        const GSTree = (0, utils_1.genNewGST)(setting.globalStateTreeDepth, setting.userStateTreeDepth);
        const rootHistories = [];
        it('sign up other users', async () => {
            for (let i = 0; i < userNum; i++) {
                const randomCommitment = (0, crypto_1.genRandomSalt)();
                const randomAttesterId = Math.floor(Math.random() * 3);
                const randomAirdropAmount = Math.floor(Math.random() * 3);
                await userState.signUp(epoch, randomCommitment, randomAttesterId, randomAirdropAmount);
                const userObj = JSON.parse(userState.toJSON());
                (0, chai_1.expect)(userObj.hasSignedUp, 'User state cannot be changed (hasSignedUp)').to.be.false;
                (0, chai_1.expect)(userObj.latestTransitionedEpoch, 'User state cannot be changed (latestTransitionedEpoch)').equal(0);
                (0, chai_1.expect)(userObj.latestGSTLeafIndex, 'User state cannot be changed (latestGSTLeafIndex)').equal(0);
                (0, chai_1.expect)(userObj.unirepState.GSTLeaves[epoch].length, 'Unirep state should be changed').equal(i + 1);
                // GST should match
                const USTRoot = await (0, core_1.computeInitUserStateRoot)(setting.userStateTreeDepth, randomAttesterId, randomAirdropAmount);
                const GSTLeaf = (0, crypto_1.hashLeftRight)(randomCommitment, USTRoot);
                GSTree.insert(GSTLeaf);
                const unirepGSTree = userState.getUnirepStateGSTree(epoch);
                (0, chai_1.expect)(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root);
                rootHistories.push(GSTree.root);
            }
        });
        it('query Unirep GSTree in the invalid epoch should fail', async () => {
            const wrongEpoch = epoch + 1;
            let error;
            try {
                userState.getUnirepStateGSTree(wrongEpoch);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('sign up the user himself', async () => {
            await userState.signUp(epoch, (0, crypto_1.genIdentityCommitment)(user), signedUpAttesterId, signedUpAirdrop);
            const userObj = JSON.parse(userState.toJSON());
            (0, chai_1.expect)(userObj.hasSignedUp, 'User state should be changed (hasSignedUp)').to.be.true;
            (0, chai_1.expect)(userObj.latestTransitionedEpoch, 'User state should be changed (latestTransitionedEpoch)').not.equal(0);
            (0, chai_1.expect)(userObj.latestGSTLeafIndex, 'User state should be changed (latestGSTLeafIndex)').equal(userNum);
            (0, chai_1.expect)(userObj.unirepState.GSTLeaves[epoch].length, 'Unirep state should be changed').equal(userNum + 1);
            (0, chai_1.expect)(userObj.latestUserStateLeaves[signedUpAttesterId], 'Sign up airdrop should be updated').not.to.be.undefined;
            // GST should match
            const USTRoot = await (0, core_1.computeInitUserStateRoot)(setting.userStateTreeDepth, signedUpAttesterId, signedUpAirdrop);
            const GSTLeaf = (0, crypto_1.hashLeftRight)((0, crypto_1.genIdentityCommitment)(user), USTRoot);
            GSTree.insert(GSTLeaf);
            const unirepGSTree = userState.getUnirepStateGSTree(epoch);
            (0, chai_1.expect)(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root);
            rootHistories.push(GSTree.root);
        });
        it('continue sign up other users', async () => {
            for (let i = 0; i < (maxUsers - userNum) - 3; i++) {
                const randomCommitment = (0, crypto_1.genRandomSalt)();
                await userState.signUp(epoch, randomCommitment);
                const userObj = JSON.parse(userState.toJSON());
                (0, chai_1.expect)(userObj.hasSignedUp, 'User state should be changed (hasSignedUp)').to.be.true;
                (0, chai_1.expect)(userObj.latestTransitionedEpoch, 'User state should be changed (latestTransitionedEpoch)').not.equal(0);
                (0, chai_1.expect)(userObj.latestGSTLeafIndex, 'User state should be changed (latestGSTLeafIndex)').equal(userNum);
                (0, chai_1.expect)(userObj.unirepState.GSTLeaves[epoch].length, 'Unirep state should be changed').equal(userNum + 2 + i);
                (0, chai_1.expect)(userObj.latestUserStateLeaves[signedUpAttesterId], 'Sign up airdrop should be updated').not.to.be.undefined;
                // GST should match
                const USTRoot = await (0, core_1.computeInitUserStateRoot)(setting.userStateTreeDepth);
                const GSTLeaf = (0, crypto_1.hashLeftRight)(randomCommitment, USTRoot);
                GSTree.insert(GSTLeaf);
                const unirepGSTree = userState.getUnirepStateGSTree(epoch);
                (0, chai_1.expect)(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root);
                rootHistories.push(GSTree.root);
            }
        });
        it('sign up twice should fail', async () => {
            let error;
            try {
                await userState.signUp(epoch, (0, crypto_1.genIdentityCommitment)(user));
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('sign up in wrong epoch should fail', async () => {
            const wrongEpoch = epoch + 1;
            let error;
            try {
                await userState.signUp(wrongEpoch, (0, crypto_1.genRandomSalt)());
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('Query global state tree roots should success', async () => {
            for (let root of rootHistories) {
                const exist = userState.GSTRootExists(root, epoch);
                (0, chai_1.expect)(exist, 'Query global state tree root from User state failed').to.be.true;
            }
        });
        it('Query global state tree roots with wrong input should success', async () => {
            const notExist = userState.GSTRootExists((0, crypto_1.genRandomSalt)(), epoch);
            (0, chai_1.expect)(notExist, 'Query non-exist root from User state should fail').to.be.false;
            const invalidEpoch = epoch + 1;
            for (let root of rootHistories) {
                let error;
                try {
                    userState.GSTRootExists(root, invalidEpoch);
                }
                catch (e) {
                    error = e;
                }
                (0, chai_1.expect)(error).not.to.be.undefined;
            }
        });
    });
    describe('Add attestations', async () => {
        it('update User state should success', async () => {
            const maxEpochKeyNum = 10;
            const epochKeyNum = Math.ceil(Math.random() * maxEpochKeyNum);
            for (let i = 0; i < epochKeyNum; i++) {
                const maxAttestPerEpochKeyNum = 20;
                const attestNum = Math.ceil(Math.random() * maxAttestPerEpochKeyNum);
                const epochKey = BigInt((0, crypto_1.genRandomSalt)().toString()) % BigInt(2 ** setting.epochLength);
                epochKeys.push(epochKey.toString());
                attestationsToEpochKey[epochKey.toString()] = [];
                for (let j = 0; j < attestNum; j++) {
                    const attestation = (0, utils_1.genRandomAttestation)();
                    userState.addAttestation(epochKey.toString(), attestation);
                    attestationsToEpochKey[epochKey.toString()].push(attestation.toJSON());
                }
            }
        });
        it('add attestations to user himself', async () => {
            for (let i = 0; i < core_1.numEpochKeyNoncePerEpoch; i++) {
                const userEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, i).toString();
                epochKeys.push(userEpk.toString());
                attestationsToEpochKey[userEpk.toString()] = [];
                const maxAttestPerEpochKeyNum = 10;
                const attestNum = Math.ceil(Math.random() * maxAttestPerEpochKeyNum);
                for (let j = 0; j < attestNum; j++) {
                    const attestation = (0, utils_1.genRandomAttestation)();
                    userState.addAttestation(userEpk.toString(), attestation);
                    attestationsToEpochKey[userEpk.toString()].push(attestation.toJSON());
                }
            }
        });
        it('wrong epoch key should throw error', async () => {
            let error;
            const wrongEpochKey = (0, crypto_1.genRandomSalt)();
            const attestation = (0, utils_1.genRandomAttestation)();
            try {
                userState.addAttestation(wrongEpochKey.toString(), attestation);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('Get attestations should success', async () => {
            for (let i = 0; i < epochKeys.length; i++) {
                const unirepAttestations = userState.getAttestations(epochKeys[i]);
                for (let j = 0; j < unirepAttestations.length; j++) {
                    (0, chai_1.expect)(unirepAttestations[j].toJSON(), 'Query attestations from Unirep state failed')
                        .equal(attestationsToEpochKey[epochKeys[i]][j]);
                }
            }
        });
        it('Get attestation with non exist epoch key should return an empty array', async () => {
            const epochKey = BigInt((0, crypto_1.genRandomSalt)().toString()) % BigInt(2 ** setting.epochLength);
            const unirepAttestations = userState.getAttestations(epochKey.toString());
            (0, chai_1.expect)(unirepAttestations.length).equal(0);
        });
        it('Get attestation with invalid epoch key should throw error', async () => {
            let error;
            const wrongEpochKey = (0, crypto_1.genRandomSalt)();
            try {
                userState.getAttestations(wrongEpochKey.toString());
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('get epoch keys should success', async () => {
            const unirepState_ = userState.getUnirepState();
            const unirepEpochKeys = unirepState_.getEpochKeys(epoch);
            (0, chai_1.expect)(unirepEpochKeys.length).equal(epochKeys.length);
            for (let epk of unirepEpochKeys) {
                (0, chai_1.expect)(epochKeys.indexOf(epk)).not.equal(-1);
            }
        });
        it('add reputation nullifiers', async () => {
            const nullifierNum = Math.ceil(Math.random() * 10);
            for (let i = 0; i < nullifierNum; i++) {
                const nullifier = (0, crypto_1.genRandomSalt)();
                userState.addReputationNullifiers(nullifier);
                // submit the same nullifier twice should fail
                let error;
                try {
                    userState.addReputationNullifiers(nullifier);
                }
                catch (e) {
                    error = e;
                }
                (0, chai_1.expect)(error).not.to.be.undefined;
                // query nullifier should succeed
                const exist = userState.nullifierExist(nullifier);
                (0, chai_1.expect)(exist, 'Query reputation nullifier from Unirep state failed').to.be.true;
            }
        });
        it('non exist nullifier should return false', async () => {
            const notExist = unirepState.nullifierExist((0, crypto_1.genRandomSalt)());
            (0, chai_1.expect)(notExist, 'Query non exist nullifier from Unirep state with wrong result').to.be.false;
        });
    });
    describe('Generate proofs', async () => {
        it('generate epoch key proof should succeed', async () => {
            for (let i = 0; i < setting.numEpochKeyNoncePerEpoch; i++) {
                const results = await userState.genVerifyEpochKeyProof(i);
                const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, i).toString();
                const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.verifyEpochKey, results.proof, results.publicSignals);
                (0, chai_1.expect)(isValid).to.be.true;
                (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
                (0, chai_1.expect)(results.epoch).equal(epoch.toString());
                const outputGSTRoot = results.globalStateTree;
                const exist = userState.GSTRootExists(outputGSTRoot, epoch);
                (0, chai_1.expect)(exist).to.be.true;
            }
        });
        it('generate epoch key proof with invalid nonce should fail', async () => {
            let error;
            const invalidNonce = setting.numEpochKeyNoncePerEpoch;
            try {
                await userState.genVerifyEpochKeyProof(invalidNonce);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('non signed up user should not generate epoch key proof', async () => {
            let error;
            const invalidUserState = new core_1.UserState(unirepState, (0, crypto_1.genIdentity)());
            const epkNonce = 0;
            try {
                await invalidUserState.genVerifyEpochKeyProof(epkNonce);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('generate reputation proof should succeed', async () => {
            const epkNonce = Math.floor(Math.random() * setting.numEpochKeyNoncePerEpoch);
            const proveMinRep = Math.floor(Math.random() * signedUpAirdrop);
            const results = await userState.genProveReputationProof(BigInt(signedUpAttesterId), epkNonce, proveMinRep);
            const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, epkNonce).toString();
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.true;
            (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
            (0, chai_1.expect)(results.epoch).equal(epoch.toString());
            const outputGSTRoot = results.globalStatetreeRoot;
            const exist = userState.GSTRootExists(outputGSTRoot, epoch);
            (0, chai_1.expect)(exist).to.be.true;
            (0, chai_1.expect)(Number(results.minRep)).equal(proveMinRep);
        });
        it('generate reputation proof with nullifiers nonces should succeed', async () => {
            const epkNonce = Math.floor(Math.random() * setting.numEpochKeyNoncePerEpoch);
            const proveNullifiers = Math.floor(Math.random() * signedUpAirdrop);
            const nonceList = [];
            for (let i = 0; i < setting.maxReputationBudget; i++) {
                if (i < proveNullifiers)
                    nonceList.push(BigInt(i));
                else
                    nonceList.push(BigInt(-1));
            }
            const results = await userState.genProveReputationProof(BigInt(signedUpAttesterId), epkNonce, undefined, undefined, undefined, nonceList);
            const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, epkNonce).toString();
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.true;
            (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
            (0, chai_1.expect)(results.epoch).equal(epoch.toString());
            const outputGSTRoot = results.globalStatetreeRoot;
            const exist = userState.GSTRootExists(outputGSTRoot, epoch);
            (0, chai_1.expect)(exist).to.be.true;
            (0, chai_1.expect)(Number(results.proveReputationAmount)).equal(proveNullifiers);
        });
        it('generate reputation proof with invalid min rep should fail', async () => {
            const epkNonce = Math.floor(Math.random() * setting.numEpochKeyNoncePerEpoch);
            const proveMinRep = signedUpAirdrop + 1;
            const results = await userState.genProveReputationProof(BigInt(signedUpAttesterId), epkNonce, proveMinRep);
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.false;
        });
        it('generate reputation proof with not exist attester ID should fail', async () => {
            const epkNonce = Math.floor(Math.random() * setting.numEpochKeyNoncePerEpoch);
            const nonSignUpAttesterId = signedUpAttesterId + 1;
            const proveMinRep = 1;
            const results = await userState.genProveReputationProof(BigInt(nonSignUpAttesterId), epkNonce, proveMinRep);
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.false;
        });
        it('non signed up user should not generate reputation proof', async () => {
            const epkNonce = Math.floor(Math.random() * setting.numEpochKeyNoncePerEpoch);
            const proveMinRep = Math.floor(Math.random() * signedUpAirdrop);
            let error;
            const invalidUserState = new core_1.UserState(unirepState, (0, crypto_1.genIdentity)());
            try {
                await invalidUserState.genProveReputationProof(BigInt(signedUpAttesterId), epkNonce, proveMinRep);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('generate sign up proof should succeed', async () => {
            const epkNonce = 0;
            const results = await userState.genUserSignUpProof(BigInt(signedUpAttesterId));
            const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, epkNonce).toString();
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveUserSignUp, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.true;
            (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
            (0, chai_1.expect)(results.epoch).equal(epoch.toString());
            const outputGSTRoot = results.globalStateTreeRoot;
            const exist = userState.GSTRootExists(outputGSTRoot, epoch);
            (0, chai_1.expect)(exist).to.be.true;
            (0, chai_1.expect)(Number(results.userHasSignedUp)).equal(1);
        });
        it('generate sign up proof with other attester ID should succeed', async () => {
            const epkNonce = 0;
            const nonSignUpAttesterId = signedUpAttesterId + 1;
            const results = await userState.genUserSignUpProof(BigInt(nonSignUpAttesterId));
            const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, epkNonce).toString();
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveUserSignUp, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.true;
            (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
            (0, chai_1.expect)(results.epoch).equal(epoch.toString());
            const outputGSTRoot = results.globalStateTreeRoot;
            const exist = userState.GSTRootExists(outputGSTRoot, epoch);
            (0, chai_1.expect)(exist).to.be.true;
            (0, chai_1.expect)(Number(results.userHasSignedUp)).equal(0);
        });
        it('non signed up user should not generate user sign up proof', async () => {
            let error;
            const invalidUserState = new core_1.UserState(unirepState, (0, crypto_1.genIdentity)());
            try {
                await invalidUserState.genUserSignUpProof(BigInt(signedUpAttesterId));
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
    });
    describe('Epoch transition', async () => {
        const GSTree = (0, utils_1.genNewGST)(setting.globalStateTreeDepth, setting.userStateTreeDepth);
        const rootHistories = [];
        it('epoch transition', async () => {
            await userState.epochTransition(epoch);
            (0, chai_1.expect)(userState.getUnirepStateCurrentEpoch(), 'Unirep epoch should increase by 1').equal(epoch + 1);
            epoch = userState.getUnirepStateCurrentEpoch();
            // sealed epoch key should not add attestations
            for (let i = 0; i < epochKeys.length; i++) {
                const attestation = (0, utils_1.genRandomAttestation)();
                // submit the attestation to sealed epoch key should fail
                let error;
                try {
                    userState.addAttestation(epochKeys[i], attestation);
                }
                catch (e) {
                    error = e;
                }
                (0, chai_1.expect)(error).not.to.be.undefined;
            }
        });
        it('generate epoch tree should succeed', async () => {
            const prevEpoch = 1;
            const epochTree = await userState.getUnirepStateEpochTree(prevEpoch);
            const root = epochTree.getRootHash();
            const exist = await userState.epochTreeRootExists(root, prevEpoch);
            (0, chai_1.expect)(exist).to.be.true;
        });
        it('epoch transition with wrong epoch input should fail', async () => {
            const wrongEpoch = 1;
            let error;
            try {
                await userState.epochTransition(wrongEpoch);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('transition other users state should success', async () => {
            for (let i = 0; i < userNum; i++) {
                const fromEpoch = 1;
                const newGSTLeaf = (0, crypto_1.genRandomSalt)();
                const epkNullifiers = [];
                for (let j = 0; j < core_1.numEpochKeyNoncePerEpoch; j++) {
                    epkNullifiers.push((0, crypto_1.genRandomSalt)());
                }
                await userState.userStateTransition(fromEpoch, newGSTLeaf, epkNullifiers);
                const userObj = JSON.parse(userState.toJSON());
                (0, chai_1.expect)(userObj.latestTransitionedEpoch, 'User state should not be changed (latestTransitionedEpoch)').equal(1);
                (0, chai_1.expect)(userObj.latestGSTLeafIndex, 'User state should not be changed (latestGSTLeafIndex)').equal(userNum);
                (0, chai_1.expect)(userObj.unirepState.GSTLeaves[epoch].length, 'Unirep state should be changed').equal(1 + i);
                GSTree.insert(newGSTLeaf);
                const unirepGSTree = userState.getUnirepStateGSTree(epoch);
                (0, chai_1.expect)(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root);
                rootHistories.push(GSTree.root);
            }
        });
        it('generate user state transition proofs and verify them should success', async () => {
            const { startTransitionProof, processAttestationProofs, finalTransitionProof } = await userState.genUserStateTransitionProofs();
            const isStartProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.startTransition, startTransitionProof.proof, startTransitionProof.publicSignals);
            (0, chai_1.expect)(isStartProofValid).to.be.true;
            const fromGSTRoot = startTransitionProof.globalStateTreeRoot;
            const fromEpoch = Number(finalTransitionProof.transitionedFromEpoch);
            const exist = userState.GSTRootExists(fromGSTRoot, fromEpoch);
            (0, chai_1.expect)(exist).to.be.true;
            for (let i = 0; i < processAttestationProofs.length; i++) {
                const isProcessAttestationValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.processAttestations, processAttestationProofs[i].proof, processAttestationProofs[i].publicSignals);
                (0, chai_1.expect)(isProcessAttestationValid).to.be.true;
            }
            const isUSTProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.userStateTransition, finalTransitionProof.proof, finalTransitionProof.publicSignals);
            (0, chai_1.expect)(isUSTProofValid).to.be.true;
            (0, chai_1.expect)(finalTransitionProof.fromGSTRoot)
                .equal(startTransitionProof.globalStateTreeRoot);
            // epoch tree
            const fromEpochTree = finalTransitionProof.fromEpochTree;
            const epochTreeExist = await userState.epochTreeRootExists(fromEpochTree, fromEpoch);
            (0, chai_1.expect)(epochTreeExist).to.be.true;
            const unirepEpochTree = await userState.getUnirepStateEpochTree(fromEpoch);
            (0, chai_1.expect)(unirepEpochTree.getRootHash().toString())
                .equal(fromEpochTree);
            // epoch key nullifiers
            const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch);
            for (let nullifier of epkNullifiers) {
                (0, chai_1.expect)(finalTransitionProof.epochKeyNullifiers.indexOf(nullifier.toString()))
                    .not.equal(-1);
            }
            const GSTLeaf = BigInt(finalTransitionProof.newGlobalStateTreeLeaf);
            await userState.userStateTransition(fromEpoch, GSTLeaf, epkNullifiers);
            const userObj = JSON.parse(userState.toJSON());
            (0, chai_1.expect)(Number(userObj.latestTransitionedEpoch), `User state mismatches current epoch: ${epoch}`).equal(epoch);
            // global state tree
            const USTree_ = await userState.genUserStateTree();
            const GSTLeaf_ = (0, crypto_1.hashLeftRight)((0, crypto_1.genIdentityCommitment)(user), USTree_.getRootHash());
            (0, chai_1.expect)(GSTLeaf_.toString()).equal(finalTransitionProof.newGlobalStateTreeLeaf);
            GSTree.insert(GSTLeaf_);
            const unirepGSTree = userState.getUnirepStateGSTree(epoch);
            (0, chai_1.expect)(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root);
            rootHistories.push(GSTree.root);
        });
        it('get attestations should work', async () => {
            const prevEpoch = 1;
            const reputationRecord = {};
            reputationRecord[signedUpAttesterId.toString()] = new core_1.Reputation(BigInt(signedUpAirdrop), BigInt(0), BigInt(0), BigInt(1));
            for (let i = 0; i < core_1.numEpochKeyNoncePerEpoch; i++) {
                const userEpk = (0, core_1.genEpochKey)(user.identityNullifier, prevEpoch, i).toString();
                const attestations = attestationsToEpochKey[userEpk.toString()];
                for (const attestation of attestations) {
                    const attesterId_ = BigInt(JSON.parse(attestation).attesterId);
                    if (reputationRecord[attesterId_.toString()] === undefined) {
                        reputationRecord[attesterId_.toString()] = new core_1.Reputation(BigInt(JSON.parse(attestation).posRep), BigInt(JSON.parse(attestation).negRep), BigInt(JSON.parse(attestation).graffiti), BigInt(JSON.parse(attestation).signUp));
                    }
                    else {
                        reputationRecord[attesterId_.toString()].update(BigInt(JSON.parse(attestation).posRep), BigInt(JSON.parse(attestation).negRep), BigInt(JSON.parse(attestation).graffiti), BigInt(JSON.parse(attestation).signUp));
                    }
                }
            }
            for (const attester in reputationRecord) {
                const rep_ = userState.getRepByAttester(BigInt(attester));
                (0, chai_1.expect)(reputationRecord[attester].toJSON()).equal(rep_.toJSON());
            }
        });
        it('continue transition other users state should success', async () => {
            for (let i = 0; i < (maxUsers - userNum) - 3; i++) {
                const fromEpoch = 1;
                const newGSTLeaf = (0, crypto_1.genRandomSalt)();
                const epkNullifiers = [];
                for (let j = 0; j < core_1.numEpochKeyNoncePerEpoch; j++) {
                    epkNullifiers.push((0, crypto_1.genRandomSalt)());
                }
                await userState.userStateTransition(fromEpoch, newGSTLeaf, epkNullifiers);
                const userObj = JSON.parse(userState.toJSON());
                (0, chai_1.expect)(userObj.latestTransitionedEpoch, 'User state should not be changed (latestTransitionedEpoch)').equal(epoch);
                (0, chai_1.expect)(userObj.latestGSTLeafIndex, 'User state should not be changed (latestGSTLeafIndex)').equal(userNum);
                (0, chai_1.expect)(userObj.unirepState.GSTLeaves[epoch].length, 'Unirep state should be changed').equal(userNum + 2 + i);
                GSTree.insert(newGSTLeaf);
                const unirepGSTree = userState.getUnirepStateGSTree(epoch);
                (0, chai_1.expect)(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root);
                rootHistories.push(GSTree.root);
            }
        });
    });
    describe('Generate proofs in the next epoch', async () => {
        it('generate epoch key proof should succeed', async () => {
            for (let i = 0; i < setting.numEpochKeyNoncePerEpoch; i++) {
                const results = await userState.genVerifyEpochKeyProof(i);
                const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, i).toString();
                const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.verifyEpochKey, results.proof, results.publicSignals);
                (0, chai_1.expect)(isValid).to.be.true;
                (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
                (0, chai_1.expect)(results.epoch).equal(epoch.toString());
                const outputGSTRoot = results.globalStateTree;
                const exist = userState.GSTRootExists(outputGSTRoot, epoch);
                (0, chai_1.expect)(exist).to.be.true;
            }
        });
        it('generate epoch key proof with invalid nonce should fail', async () => {
            let error;
            const invalidNonce = setting.numEpochKeyNoncePerEpoch;
            try {
                await userState.genVerifyEpochKeyProof(invalidNonce);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('non signed up user should not generate epoch key proof', async () => {
            let error;
            const invalidUserState = new core_1.UserState(unirepState, (0, crypto_1.genIdentity)());
            const epkNonce = 0;
            try {
                await invalidUserState.genVerifyEpochKeyProof(epkNonce);
            }
            catch (e) {
                error = e;
            }
            (0, chai_1.expect)(error).not.to.be.undefined;
        });
        it('generate reputation proof should succeed', async () => {
            const epkNonce = Math.floor(Math.random() * setting.numEpochKeyNoncePerEpoch);
            const rep = userState.getRepByAttester(BigInt(signedUpAttesterId));
            let proveMinRep;
            if ((Number(rep.posRep) - Number(rep.negRep)) > 0) {
                proveMinRep = Number(rep.posRep) - Number(rep.negRep);
            }
            else {
                proveMinRep = 0;
            }
            const results = await userState.genProveReputationProof(BigInt(signedUpAttesterId), epkNonce, proveMinRep);
            const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, epkNonce).toString();
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.true;
            (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
            (0, chai_1.expect)(results.epoch).equal(epoch.toString());
            const outputGSTRoot = results.globalStatetreeRoot;
            const exist = userState.GSTRootExists(outputGSTRoot, epoch);
            (0, chai_1.expect)(exist).to.be.true;
            (0, chai_1.expect)(Number(results.minRep)).equal(proveMinRep);
        });
        it('generate sign up proof should succeed', async () => {
            const epkNonce = 0;
            const results = await userState.genUserSignUpProof(BigInt(signedUpAttesterId));
            const expectedEpk = (0, core_1.genEpochKey)(user.identityNullifier, epoch, epkNonce).toString();
            const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveUserSignUp, results.proof, results.publicSignals);
            (0, chai_1.expect)(isValid).to.be.true;
            (0, chai_1.expect)(results.epochKey).equal(expectedEpk);
            (0, chai_1.expect)(results.epoch).equal(epoch.toString());
            const outputGSTRoot = results.globalStateTreeRoot;
            const exist = userState.GSTRootExists(outputGSTRoot, epoch);
            (0, chai_1.expect)(exist).to.be.true;
            (0, chai_1.expect)(Number(results.userHasSignedUp)).equal(1);
        });
    });
});
