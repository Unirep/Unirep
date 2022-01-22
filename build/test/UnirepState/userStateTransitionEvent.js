"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const crypto_1 = require("@unirep/crypto");
const contracts_1 = require("@unirep/contracts");
const core_1 = require("../../core");
const utils_1 = require("../utils");
const circuits_1 = require("@unirep/circuits");
describe('User state transition events in Unirep State', async function () {
    this.timeout(500000);
    let userIds = [];
    let userCommitments = [];
    let userStateTreeRoots = [];
    let signUpAirdrops = [];
    let attestations = [];
    let unirepContract;
    let unirepContractCalledByAttester;
    let _treeDepths = (0, utils_1.getTreeDepthsForTesting)("circuit");
    let accounts;
    const attester = new Object();
    let attesterId;
    const maxUsers = 10;
    const userNum = Math.ceil(Math.random() * maxUsers);
    const transitionedUsers = [];
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: core_1.maxAttesters,
            numEpochKeyNoncePerEpoch: core_1.numEpochKeyNoncePerEpoch,
            maxReputationBudget: core_1.maxReputationBudget,
            epochLength: core_1.epochLength,
            attestingFee: core_1.attestingFee
        };
        unirepContract = await (0, contracts_1.deployUnirep)(accounts[0], _treeDepths, _settings);
    });
    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2];
            attester['addr'] = await attester['acct'].getAddress();
            unirepContractCalledByAttester = unirepContract.connect(attester['acct']);
            let tx = await unirepContractCalledByAttester.attesterSignUp();
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status, 'Attester signs up failed').to.equal(1);
            attesterId = BigInt(await unirepContract.attesters(attester['addr']));
        });
        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10;
            const tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep);
            const receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            const airdroppedAmount = await unirepContract.airdropAmount(attester['addr']);
            (0, chai_1.expect)(airdroppedAmount.toNumber()).equal(airdropPosRep);
        });
    });
    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const contractEpoch = await unirepContract.currentEpoch();
            const unirepEpoch = initUnirepState.currentEpoch;
            (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch);
            (0, chai_1.expect)(unirepGSTLeaves).equal(0);
            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch);
            const defaultGSTree = (0, utils_1.genNewGST)(_treeDepths.globalStateTreeDepth, _treeDepths.userStateTreeDepth);
            (0, chai_1.expect)(unirepGSTree.root).equal(defaultGSTree.root);
        });
    });
    describe('User Sign Up event', async () => {
        const GSTree = (0, utils_1.genNewGST)(_treeDepths.globalStateTreeDepth, _treeDepths.userStateTreeDepth);
        const rootHistories = [];
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = (0, crypto_1.genIdentity)();
                const commitment = (0, crypto_1.genIdentityCommitment)(id);
                userIds.push(id);
                userCommitments.push(commitment);
                const tx = await unirepContractCalledByAttester.userSignUp(commitment);
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status, 'User sign up failed').to.equal(1);
                await (0, chai_1.expect)(unirepContractCalledByAttester.userSignUp(commitment))
                    .to.be.revertedWith('Unirep: the user has already signed up');
                const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = unirepState.currentEpoch;
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch);
                (0, chai_1.expect)(unirepGSTLeaves).equal(i + 1);
                const attesterId = await unirepContract.attesters(attester['addr']);
                const airdroppedAmount = await unirepContract.airdropAmount(attester['addr']);
                const newUSTRoot = await (0, core_1.computeInitUserStateRoot)(_treeDepths.userStateTreeDepth, Number(attesterId), Number(airdroppedAmount));
                const newGSTLeaf = (0, crypto_1.hashLeftRight)(commitment, newUSTRoot);
                userStateTreeRoots.push(newUSTRoot);
                signUpAirdrops.push(new core_1.Reputation(BigInt(airdroppedAmount), BigInt(0), BigInt(0), BigInt(1)));
                attestations.push(core_1.Reputation.default());
                GSTree.insert(newGSTLeaf);
                rootHistories.push(GSTree.root);
            }
        });
        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const id = (0, crypto_1.genIdentity)();
                const commitment = (0, crypto_1.genIdentityCommitment)(id);
                userIds.push(id);
                userCommitments.push(commitment);
                const tx = await unirepContract.userSignUp(commitment);
                const receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status, 'User sign up failed').to.equal(1);
                const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = unirepState.currentEpoch;
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch);
                (0, chai_1.expect)(unirepGSTLeaves).equal(userNum + i + 1);
                const newUSTRoot = await (0, core_1.computeInitUserStateRoot)(_treeDepths.userStateTreeDepth);
                const newGSTLeaf = (0, crypto_1.hashLeftRight)(commitment, newUSTRoot);
                userStateTreeRoots.push(newUSTRoot);
                signUpAirdrops.push(core_1.Reputation.default());
                attestations.push(core_1.Reputation.default());
                GSTree.insert(newGSTLeaf);
                rootHistories.push(GSTree.root);
            }
        });
        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const unirepStateBefore = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const unirepEpoch = unirepStateBefore.currentEpoch;
            const unirepGSTLeavesBefore = unirepStateBefore.getNumGSTLeaves(unirepEpoch);
            const id = (0, crypto_1.genIdentity)();
            const commitment = (0, crypto_1.genIdentityCommitment)(id);
            await (0, chai_1.expect)(unirepContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: maximum number of user signups reached');
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch);
            (0, chai_1.expect)(unirepGSTLeaves).equal(unirepGSTLeavesBefore);
        });
        it('Check GST roots match Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(root, unirepState.currentEpoch);
                (0, chai_1.expect)(exist).to.be.true;
            }
        });
    });
    describe('Epoch transition event with no attestation', async () => {
        it('premature epoch transition should fail', async () => {
            await (0, chai_1.expect)(unirepContract.beginEpochTransition()).to.be.revertedWith('Unirep: epoch not yet ended');
        });
        it('epoch transition should succeed', async () => {
            // Record data before epoch transition so as to compare them with data after epoch transition
            let epoch = await unirepContract.currentEpoch();
            // Fast-forward epochLength of seconds
            await hardhat_1.ethers.provider.send("evm_increaseTime", [core_1.epochLength]);
            // Assert no epoch transition compensation is dispensed to volunteer
            (0, chai_1.expect)(await unirepContract.epochTransitionCompensation(attester['addr'])).to.be.equal(0);
            // Begin epoch transition 
            let tx = await unirepContractCalledByAttester.beginEpochTransition();
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            console.log("Gas cost of epoch transition:", receipt.gasUsed.toString());
            // Verify compensation to the volunteer increased
            (0, chai_1.expect)(await unirepContract.epochTransitionCompensation(attester['addr'])).to.gt(0);
            // Complete epoch transition
            (0, chai_1.expect)(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1));
            // Verify latestEpochTransitionTime and currentEpoch
            let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime();
            (0, chai_1.expect)(latestEpochTransitionTime).equal((await hardhat_1.ethers.provider.getBlock(receipt.blockNumber)).timestamp);
            let epoch_ = await unirepContract.currentEpoch();
            (0, chai_1.expect)(epoch_).equal(epoch.add(1));
        });
    });
    describe('User state transition events with no attestation', async () => {
        let storedUnirepState;
        let invalidProofIndexes = [];
        const notTransitionUsers = [];
        const setting = {
            globalStateTreeDepth: _treeDepths.globalStateTreeDepth,
            userStateTreeDepth: _treeDepths.userStateTreeDepth,
            epochTreeDepth: _treeDepths.epochTreeDepth,
            attestingFee: core_1.attestingFee,
            epochLength: core_1.epochLength,
            numEpochKeyNoncePerEpoch: core_1.numEpochKeyNoncePerEpoch,
            maxReputationBudget: core_1.maxReputationBudget,
        };
        it('Users should successfully perform user state transition', async () => {
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp();
            const userSignedUpEvents = await unirepContract.queryFilter(UserSignedUpFilter);
            for (let i = 0; i < userIds.length; i++) {
                console.log(`process user: ${i + 1}`);
                const randomUST = Math.round(Math.random());
                if (randomUST === 0) {
                    notTransitionUsers.push(i);
                    continue;
                }
                const unirepState = new core_1.UnirepState(setting);
                const userState = new core_1.UserState(unirepState, userIds[i]);
                for (let signUpEvent of userSignedUpEvents) {
                    const args = signUpEvent === null || signUpEvent === void 0 ? void 0 : signUpEvent.args;
                    const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
                    const commitment = BigInt(args === null || args === void 0 ? void 0 : args._identityCommitment);
                    const attesterId = Number(args === null || args === void 0 ? void 0 : args._attesterId);
                    const airdrop = Number(args === null || args === void 0 ? void 0 : args._airdropAmount);
                    await userState.signUp(epoch, commitment, attesterId, airdrop);
                }
                await userState.epochTransition(1);
                const { startTransitionProof, processAttestationProofs, finalTransitionProof } = await userState.genUserStateTransitionProofs();
                const proofIndexes = [];
                let isValid = await (0, utils_1.verifyStartTransitionProof)(startTransitionProof);
                (0, chai_1.expect)(isValid).to.be.true;
                // submit proofs
                let tx = await unirepContract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
                let receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                // submit twice should fail
                await (0, chai_1.expect)(unirepContract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof))).to.be.revertedWith("Unirep: the proof has been submitted before");
                let hashedProof = await unirepContract.hashStartTransitionProof(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
                for (let i = 0; i < processAttestationProofs.length; i++) {
                    isValid = await (0, utils_1.verifyProcessAttestationsProof)(processAttestationProofs[i]);
                    (0, chai_1.expect)(isValid).to.be.true;
                    tx = await unirepContract.processAttestations(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                    receipt = await tx.wait();
                    (0, chai_1.expect)(receipt.status).to.equal(1);
                    // submit twice should fail
                    await (0, chai_1.expect)(unirepContract.processAttestations(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof))).to.be.revertedWith("Unirep: the proof has been submitted before");
                    let hashedProof = await unirepContract.hashProcessAttestationsProof(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                    proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
                }
                const USTInput = new contracts_1.UserTransitionProof(finalTransitionProof.publicSignals, finalTransitionProof.proof);
                isValid = await USTInput.verify();
                (0, chai_1.expect)(isValid).to.be.true;
                tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes);
                receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                // submit twice should fail
                await (0, chai_1.expect)(unirepContract.updateUserStateRoot(USTInput, proofIndexes))
                    .to.be.revertedWith("Unirep: the proof has been submitted before");
                transitionedUsers.push(i);
            }
        });
        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            storedUnirepState = unirepState.toJSON();
            const unirepObj = JSON.parse(unirepState.toJSON());
            const currentEpoch = Number(await unirepContract.currentEpoch());
            (0, chai_1.expect)(unirepObj.currentEpoch).equal(currentEpoch);
            (0, chai_1.expect)(unirepObj.GSTLeaves[currentEpoch].length).equal(transitionedUsers.length);
            (0, chai_1.expect)(unirepObj.epochTreeLeaves[currentEpoch - 1].length).equal(0);
            (0, chai_1.expect)(unirepObj.nullifiers.length).equal(transitionedUsers.length * 3);
        });
        it('User generate two UST proofs should not affect Unirep state', async () => {
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp();
            const userSignedUpEvents = await unirepContract.queryFilter(UserSignedUpFilter);
            if (transitionedUsers.length === 0)
                return;
            const n = transitionedUsers[0];
            const unirepState = new core_1.UnirepState(setting);
            const userState = new core_1.UserState(unirepState, userIds[n]);
            for (let signUpEvent of userSignedUpEvents) {
                const args = signUpEvent === null || signUpEvent === void 0 ? void 0 : signUpEvent.args;
                const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
                const commitment = BigInt(args === null || args === void 0 ? void 0 : args._identityCommitment);
                const attesterId = Number(args === null || args === void 0 ? void 0 : args._attesterId);
                const airdrop = Number(args === null || args === void 0 ? void 0 : args._airdropAmount);
                await userState.signUp(epoch, commitment, attesterId, airdrop);
            }
            await userState.epochTransition(1);
            const { startTransitionProof, processAttestationProofs, finalTransitionProof } = await userState.genUserStateTransitionProofs();
            const proofIndexes = [];
            let isValid = await (0, utils_1.verifyStartTransitionProof)(startTransitionProof);
            (0, chai_1.expect)(isValid).to.be.true;
            // submit proofs
            let tx = await unirepContract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            let hashedProof = await unirepContract.hashStartTransitionProof(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
            proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await (0, utils_1.verifyProcessAttestationsProof)(processAttestationProofs[i]);
                (0, chai_1.expect)(isValid).to.be.true;
                tx = await unirepContract.processAttestations(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                let hashedProof = await unirepContract.hashProcessAttestationsProof(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
            }
            const USTInput = new contracts_1.UserTransitionProof(finalTransitionProof.publicSignals, finalTransitionProof.proof);
            isValid = await USTInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes);
            receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepStateAfterUST = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(unirepStateAfterUST.toJSON()).equal(storedUnirepState);
        });
        it('Submit invalid start tranistion proof should not affect Unirep State', async () => {
            const randomProof = (0, utils_1.genRandomList)(8);
            const randomBlindedUserState = (0, crypto_1.genRandomSalt)();
            const randomBlindedHashChain = (0, crypto_1.genRandomSalt)();
            const randomGSTRoot = (0, crypto_1.genRandomSalt)();
            const tx = await unirepContract.startUserStateTransition(randomBlindedUserState, randomBlindedHashChain, randomGSTRoot, randomProof);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(unirepState.toJSON()).equal(storedUnirepState);
            let hashedProof = await unirepContract.hashStartTransitionProof(randomBlindedUserState, randomBlindedHashChain, randomGSTRoot, randomProof);
            invalidProofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
        });
        it('Submit invalid process attestation proof should not affect Unirep State', async () => {
            const randomProof = (0, utils_1.genRandomList)(8);
            const randomOutputBlindedUserState = (0, crypto_1.genRandomSalt)();
            const randomOutputBlindedHashChain = (0, crypto_1.genRandomSalt)();
            const randomInputBlindedUserState = (0, crypto_1.genRandomSalt)();
            const tx = await unirepContract.processAttestations(randomOutputBlindedUserState, randomOutputBlindedHashChain, randomInputBlindedUserState, randomProof);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(unirepState.toJSON()).equal(storedUnirepState);
            let hashedProof = await unirepContract.hashProcessAttestationsProof(randomOutputBlindedUserState, randomOutputBlindedHashChain, randomInputBlindedUserState, randomProof);
            invalidProofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
        });
        it('Submit invalid user state transition proof should not affect Unirep State', async () => {
            const randomProof = (0, utils_1.genRandomList)(8);
            const randomNullifiers = (0, utils_1.genRandomList)(core_1.numEpochKeyNoncePerEpoch);
            const randomBlindedStates = (0, utils_1.genRandomList)(2);
            const randomBlindedChains = (0, utils_1.genRandomList)(core_1.numEpochKeyNoncePerEpoch);
            const randomUSTInput = {
                newGlobalStateTreeLeaf: (0, crypto_1.genRandomSalt)(),
                epkNullifiers: randomNullifiers,
                transitionFromEpoch: 1,
                blindedUserStates: randomBlindedStates,
                fromGlobalStateTree: (0, crypto_1.genRandomSalt)(),
                blindedHashChains: randomBlindedChains,
                fromEpochTree: (0, crypto_1.genRandomSalt)(),
                proof: randomProof,
            };
            const tx = await unirepContract.updateUserStateRoot(randomUSTInput, invalidProofIndexes);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(unirepState.toJSON()).equal(storedUnirepState);
        });
        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const unirepState = new core_1.UnirepState(setting);
            const userState = new core_1.UserState(unirepState, userIds[0]);
            const epoch = 1;
            const commitment = (0, crypto_1.genIdentityCommitment)(userIds[0]);
            const attesterId = 0;
            const airdrop = 0;
            await userState.signUp(epoch, commitment, attesterId, airdrop);
            await userState.epochTransition(1);
            const { startTransitionProof, processAttestationProofs, finalTransitionProof } = await userState.genUserStateTransitionProofs();
            const proofIndexes = [];
            let isValid = await (0, utils_1.verifyStartTransitionProof)(startTransitionProof);
            (0, chai_1.expect)(isValid).to.be.true;
            // submit proofs
            let tx = await unirepContract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            let hashedProof = await unirepContract.hashStartTransitionProof(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
            proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await (0, utils_1.verifyProcessAttestationsProof)(processAttestationProofs[i]);
                (0, chai_1.expect)(isValid).to.be.true;
                tx = await unirepContract.processAttestations(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                let hashedProof = await unirepContract.hashProcessAttestationsProof(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
            }
            const USTInput = new contracts_1.UserTransitionProof(finalTransitionProof.publicSignals, finalTransitionProof.proof);
            isValid = await USTInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes);
            receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepStateAfterUST = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(unirepStateAfterUST.toJSON()).equal(storedUnirepState);
        });
        it('mismatch proof indexes will not affect Unirep state', async () => {
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp();
            const userSignedUpEvents = await unirepContract.queryFilter(UserSignedUpFilter);
            if (notTransitionUsers.length < 2)
                return;
            const unirepState1 = new core_1.UnirepState(setting);
            const unirepState2 = new core_1.UnirepState(setting);
            const userState1 = new core_1.UserState(unirepState1, userIds[notTransitionUsers[0]]);
            const userState2 = new core_1.UserState(unirepState2, userIds[notTransitionUsers[1]]);
            for (let signUpEvent of userSignedUpEvents) {
                const args = signUpEvent === null || signUpEvent === void 0 ? void 0 : signUpEvent.args;
                const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
                const commitment = BigInt(args === null || args === void 0 ? void 0 : args._identityCommitment);
                const attesterId = Number(args === null || args === void 0 ? void 0 : args._attesterId);
                const airdrop = Number(args === null || args === void 0 ? void 0 : args._airdropAmount);
                await userState1.signUp(epoch, commitment, attesterId, airdrop);
                await userState2.signUp(epoch, commitment, attesterId, airdrop);
            }
            await userState1.epochTransition(1);
            await userState2.epochTransition(1);
            const { startTransitionProof, processAttestationProofs } = await userState1.genUserStateTransitionProofs();
            const proofIndexes = [];
            let isValid = await (0, utils_1.verifyStartTransitionProof)(startTransitionProof);
            (0, chai_1.expect)(isValid).to.be.true;
            // submit proofs
            let tx = await unirepContract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            let hashedProof = await unirepContract.hashStartTransitionProof(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
            proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await (0, utils_1.verifyProcessAttestationsProof)(processAttestationProofs[i]);
                (0, chai_1.expect)(isValid).to.be.true;
                tx = await unirepContract.processAttestations(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                let hashedProof = await unirepContract.hashProcessAttestationsProof(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
            }
            const user2Proofs = await userState2.genUserStateTransitionProofs();
            const USTInput = new contracts_1.UserTransitionProof(user2Proofs.finalTransitionProof.publicSignals, user2Proofs.finalTransitionProof.proof);
            isValid = await USTInput.verify();
            (0, chai_1.expect)(isValid).to.be.true;
            tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes);
            receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const unirepStateAfterUST = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(unirepStateAfterUST.toJSON()).equal(storedUnirepState);
        });
        it('Submit attestations to transitioned users', async () => {
            // generate user state manually
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const currentEpoch = unirepState.currentEpoch;
            const GST = unirepState.genGSTree(currentEpoch);
            const epkNonce = 0;
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userIdx = transitionedUsers[i];
                const UST = await (0, core_1.computeInitUserStateRoot)(unirepState.setting.userStateTreeDepth, Number(attesterId), Number(signUpAirdrops[userIdx].posRep));
                const circuitInputs = (0, utils_1.genEpochKeyCircuitInput)(userIds[userIdx], GST, i, UST, currentEpoch, epkNonce);
                const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuits_1.Circuit.verifyEpochKey, circuitInputs);
                const epkProofInput = new contracts_1.EpochKeyProof(publicSignals, proof);
                const isValid = await epkProofInput.verify();
                (0, chai_1.expect)(isValid).to.be.true;
                let tx = await unirepContract.submitEpochKeyProof(epkProofInput);
                let receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                const epochKey = epkProofInput.epochKey;
                const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput);
                const proofIndex = Number(await unirepContract.getProofIndex(hashedProof));
                const attestation = (0, utils_1.genRandomAttestation)();
                attestation.attesterId = attesterId;
                tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, proofIndex);
                receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                attestations[userIdx].update(attestation.posRep, attestation.negRep, attestation.graffiti, attestation.signUp);
            }
        });
        it('Unirep state should store the attestations ', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const unirepObj = JSON.parse(unirepState.toJSON());
            (0, chai_1.expect)(Object.keys(unirepObj.latestEpochKeyToAttestationsMap).length)
                .equal(transitionedUsers.length);
        });
    });
    describe('Epoch transition event with attestations', async () => {
        it('epoch transition should succeed', async () => {
            // Record data before epoch transition so as to compare them with data after epoch transition
            let epoch = await unirepContract.currentEpoch();
            // Fast-forward epochLength of seconds
            await hardhat_1.ethers.provider.send("evm_increaseTime", [core_1.epochLength]);
            // Begin epoch transition 
            let tx = await unirepContractCalledByAttester.beginEpochTransition();
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).equal(1);
            console.log("Gas cost of epoch transition:", receipt.gasUsed.toString());
            // Complete epoch transition
            (0, chai_1.expect)(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1));
            // Verify latestEpochTransitionTime and currentEpoch
            let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime();
            (0, chai_1.expect)(latestEpochTransitionTime).equal((await hardhat_1.ethers.provider.getBlock(receipt.blockNumber)).timestamp);
            let epoch_ = await unirepContract.currentEpoch();
            (0, chai_1.expect)(epoch_).equal(epoch.add(1));
        });
    });
    describe('User state transition events with attestations', async () => {
        let USTNum = 0;
        const setting = {
            globalStateTreeDepth: _treeDepths.globalStateTreeDepth,
            userStateTreeDepth: _treeDepths.userStateTreeDepth,
            epochTreeDepth: _treeDepths.epochTreeDepth,
            attestingFee: core_1.attestingFee,
            epochLength: core_1.epochLength,
            numEpochKeyNoncePerEpoch: core_1.numEpochKeyNoncePerEpoch,
            maxReputationBudget: core_1.maxReputationBudget,
        };
        it('Users should successfully perform user state transition', async () => {
            var _a;
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp();
            const userSignedUpEvents = await unirepContract.queryFilter(UserSignedUpFilter);
            const USTProofFilter = unirepContract.filters.IndexedUserStateTransitionProof();
            const USTProofEvents = await unirepContract.queryFilter(USTProofFilter);
            const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
            const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter);
            const unirepStateBefore = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const epoch = 2;
            const GSTRoot = unirepStateBefore.genGSTree(epoch).root;
            for (let i = 0; i < userIds.length; i++) {
                // console.log(`process user: ${i+1}`)
                const randomUST = Math.round(Math.random());
                if (randomUST === 0)
                    continue;
                console.log('transition user', i);
                const unirepState = new core_1.UnirepState(setting);
                const userState = new core_1.UserState(unirepState, userIds[i]);
                for (let signUpEvent of userSignedUpEvents) {
                    const args = signUpEvent === null || signUpEvent === void 0 ? void 0 : signUpEvent.args;
                    const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
                    const commitment = BigInt(args === null || args === void 0 ? void 0 : args._identityCommitment);
                    const attesterId = Number(args === null || args === void 0 ? void 0 : args._attesterId);
                    const airdrop = Number(args === null || args === void 0 ? void 0 : args._airdropAmount);
                    await userState.signUp(epoch, commitment, attesterId, airdrop);
                }
                await userState.epochTransition(1);
                for (let USTEvent of USTProofEvents) {
                    const args = (_a = USTEvent === null || USTEvent === void 0 ? void 0 : USTEvent.args) === null || _a === void 0 ? void 0 : _a._proof;
                    const fromEpoch = Number(args === null || args === void 0 ? void 0 : args.transitionFromEpoch);
                    const newGSTLeaf = BigInt(args === null || args === void 0 ? void 0 : args.newGlobalStateTreeLeaf);
                    const nullifiers = args === null || args === void 0 ? void 0 : args.epkNullifiers.map(n => BigInt(n));
                    if (!userState.nullifierExist(nullifiers[0]) &&
                        unirepStateBefore.nullifierExist(nullifiers[0])) {
                        await userState.userStateTransition(fromEpoch, newGSTLeaf, nullifiers);
                    }
                }
                for (let attestaionEvent of attestationSubmittedEvents) {
                    const args = attestaionEvent === null || attestaionEvent === void 0 ? void 0 : attestaionEvent.args;
                    const epochKey = (args === null || args === void 0 ? void 0 : args._epochKey).toString();
                    const attestation_ = args === null || args === void 0 ? void 0 : args._attestation;
                    const attestation = new core_1.Attestation(BigInt(attestation_.attesterId), BigInt(attestation_.posRep), BigInt(attestation_.negRep), BigInt(attestation_.graffiti), BigInt(attestation_.signUp));
                    userState.addAttestation(epochKey, attestation);
                }
                (0, chai_1.expect)(userState.getUnirepStateGSTree(epoch).root)
                    .equal(GSTRoot);
                await userState.epochTransition(2);
                const { startTransitionProof, processAttestationProofs, finalTransitionProof } = await userState.genUserStateTransitionProofs();
                const proofIndexes = [];
                let isValid = await (0, utils_1.verifyStartTransitionProof)(startTransitionProof);
                (0, chai_1.expect)(isValid).to.be.true;
                // submit proofs
                let tx = await unirepContract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
                let receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                let hashedProof = await unirepContract.hashStartTransitionProof(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
                for (let i = 0; i < processAttestationProofs.length; i++) {
                    isValid = await (0, utils_1.verifyProcessAttestationsProof)(processAttestationProofs[i]);
                    (0, chai_1.expect)(isValid).to.be.true;
                    tx = await unirepContract.processAttestations(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                    receipt = await tx.wait();
                    (0, chai_1.expect)(receipt.status).to.equal(1);
                    let hashedProof = await unirepContract.hashProcessAttestationsProof(processAttestationProofs[i].outputBlindedUserState, processAttestationProofs[i].outputBlindedHashChain, processAttestationProofs[i].inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestationProofs[i].proof));
                    proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)));
                }
                const USTInput = new contracts_1.UserTransitionProof(finalTransitionProof.publicSignals, finalTransitionProof.proof);
                isValid = await USTInput.verify();
                (0, chai_1.expect)(isValid).to.be.true;
                tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes);
                receipt = await tx.wait();
                (0, chai_1.expect)(receipt.status).to.equal(1);
                USTNum++;
            }
        });
        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const unirepObj = JSON.parse(unirepState.toJSON());
            const currentEpoch = Number(await unirepContract.currentEpoch());
            (0, chai_1.expect)(unirepObj.currentEpoch).equal(currentEpoch);
            (0, chai_1.expect)(unirepObj.GSTLeaves[currentEpoch].length).equal(USTNum);
            // All transitioned users received attestaions
            (0, chai_1.expect)(unirepObj.epochTreeLeaves[currentEpoch - 1].length).equal(transitionedUsers.length);
        });
    });
});
