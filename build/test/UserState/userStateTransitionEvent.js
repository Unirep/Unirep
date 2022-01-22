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
describe('User state transition events in Unirep User State', async function () {
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
    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const id = (0, crypto_1.genIdentity)();
            const initUnirepState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
            const contractEpoch = await unirepContract.currentEpoch();
            const unirepEpoch = initUnirepState.getUnirepStateCurrentEpoch();
            (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
            const unirepGSTree = initUnirepState.getUnirepStateGSTree(unirepEpoch);
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
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = userState.getUnirepStateCurrentEpoch();
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
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
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
                const contractEpoch = await unirepContract.currentEpoch();
                const unirepEpoch = userState.getUnirepStateCurrentEpoch();
                (0, chai_1.expect)(unirepEpoch).equal(Number(contractEpoch));
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
            const id = (0, crypto_1.genIdentity)();
            const commitment = (0, crypto_1.genIdentityCommitment)(id);
            const userStateBefore = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
            const GSTRootBefore = userStateBefore.getUnirepStateGSTree(1).root;
            await (0, chai_1.expect)(unirepContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: maximum number of user signups reached');
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, id);
            const GSTRoot = userState.getUnirepStateGSTree(1).root;
            (0, chai_1.expect)(GSTRoot).equal(GSTRootBefore);
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
    describe('User state transition events with no attestation', async () => {
        let storedUserState;
        const storedUserIdx = 0;
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
            for (let i = 0; i < userIds.length; i++) {
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[i]);
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
                transitionedUsers.push(i);
            }
        });
        it('Users state transition matches current Unirep state', async () => {
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[i]);
                (0, chai_1.expect)(userState.getUnirepStateCurrentEpoch())
                    .equal(userState.latestTransitionedEpoch);
            }
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            (0, chai_1.expect)(userState.getUnirepStateCurrentEpoch())
                .equal(unirepState.currentEpoch);
            for (let i = 1; i <= unirepState.currentEpoch; i++) {
                (0, chai_1.expect)(userState.getUnirepStateGSTree(i).root)
                    .equal(unirepState.genGSTree(i).root);
            }
            (0, chai_1.expect)((await userState.getUnirepStateEpochTree(1)).getRootHash())
                .equal((await unirepState.genEpochTree(1)).getRootHash());
            storedUserState = userState.toJSON();
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
            const userStateAfterUST = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            (0, chai_1.expect)(userStateAfterUST.toJSON()).equal(storedUserState);
        });
        it('Submit invalid start tranistion proof should not affect Unirep State', async () => {
            const randomProof = (0, utils_1.genRandomList)(8);
            const randomBlindedUserState = (0, crypto_1.genRandomSalt)();
            const randomBlindedHashChain = (0, crypto_1.genRandomSalt)();
            const randomGSTRoot = (0, crypto_1.genRandomSalt)();
            const tx = await unirepContract.startUserStateTransition(randomBlindedUserState, randomBlindedHashChain, randomGSTRoot, randomProof);
            let receipt = await tx.wait();
            (0, chai_1.expect)(receipt.status).to.equal(1);
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            (0, chai_1.expect)(userState.toJSON()).equal(storedUserState);
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
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            (0, chai_1.expect)(userState.toJSON()).equal(storedUserState);
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
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            (0, chai_1.expect)(userState.toJSON()).equal(storedUserState);
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
            const userStateAfterUST = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            (0, chai_1.expect)(userStateAfterUST.toJSON()).equal(storedUserState);
        });
        it('mismatch proof indexes will not affect Unirep state', async () => {
            if (notTransitionUsers.length < 2)
                return;
            const userState1 = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[notTransitionUsers[0]]);
            const userState2 = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[notTransitionUsers[1]]);
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
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            (0, chai_1.expect)(userState.toJSON()).equal(storedUserState);
        });
        it('Submit attestations to transitioned users', async () => {
            const epkNonce = 0;
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userIdx = transitionedUsers[i];
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[userIdx]);
                const { proof, publicSignals } = await userState.genVerifyEpochKeyProof(epkNonce);
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
        it('User state should store the attestations ', async () => {
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[storedUserIdx]);
            const unirepObj = JSON.parse(userState.toJSON());
            console.log(unirepObj);
            (0, chai_1.expect)(Object.keys(unirepObj.unirepState.latestEpochKeyToAttestationsMap).length)
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
        it('Users should successfully perform user state transition', async () => {
            const unirepStateBefore = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const epoch = 2;
            const GSTRoot = unirepStateBefore.genGSTree(epoch).root;
            for (let i = 0; i < userIds.length; i++) {
                const randomUST = Math.round(Math.random());
                if (randomUST === 0)
                    continue;
                console.log('transition user', i);
                const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[i]);
                (0, chai_1.expect)(userState.getUnirepStateGSTree(epoch).root)
                    .equal(GSTRoot);
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
            }
        });
        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await (0, core_1.genUnirepStateFromContract)(hardhat_1.ethers.provider, unirepContract.address);
            const userState = await (0, core_1.genUserStateFromContract)(hardhat_1.ethers.provider, unirepContract.address, userIds[0]);
            (0, chai_1.expect)(userState.getUnirepStateCurrentEpoch())
                .equal(unirepState.currentEpoch);
            for (let i = 1; i <= unirepState.currentEpoch; i++) {
                (0, chai_1.expect)(userState.getUnirepStateGSTree(i).root)
                    .equal(unirepState.genGSTree(i).root);
            }
            (0, chai_1.expect)((await userState.getUnirepStateEpochTree(2)).getRootHash())
                .equal((await unirepState.genEpochTree(2)).getRootHash());
        });
    });
});
