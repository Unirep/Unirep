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
describe('EventSequencing', () => {
    let expectedEventsInOrder = [];
    let expectedEventsNumber = 0;
    let unirepContract;
    let accounts;
    let userIds = [], userCommitments = [];
    let attester, attesterAddress, attesterId, unirepContractCalledByAttester;
    before(async () => {
        accounts = await hardhat_1.ethers.getSigners();
        const _treeDepths = (0, utils_1.getTreeDepthsForTesting)();
        unirepContract = await (0, src_1.deployUnirep)(accounts[0], _treeDepths);
        // 1. Fisrt user sign up
        let userId = (0, crypto_1.genIdentity)();
        let userCommitment = (0, crypto_1.genIdentityCommitment)(userId);
        userIds.push(userId);
        userCommitments.push(userCommitment);
        let tx = await unirepContract.userSignUp(userCommitment);
        let receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.UserSignedUp);
        expectedEventsNumber++;
        // Attester sign up, no events emitted
        attester = accounts[1];
        attesterAddress = await attester.getAddress();
        unirepContractCalledByAttester = await hardhat_1.ethers.getContractAt(src_1.Unirep.abi, unirepContract.address, attester);
        tx = await unirepContractCalledByAttester.attesterSignUp();
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        attesterId = await unirepContract.attesters(attesterAddress);
        // 2. Submit epoch key proof
        let currentEpoch = await unirepContract.currentEpoch();
        let epochKeyNonce = 0;
        let epochKey = (0, utils_1.genEpochKey)(userIds[0].getNullifier(), currentEpoch.toNumber(), epochKeyNonce);
        const proof = [];
        for (let i = 0; i < 8; i++) {
            proof.push('0');
        }
        let publicSignals = [(0, crypto_1.genRandomSalt)(), currentEpoch, epochKey];
        let epochKeyProof = new src_1.EpochKeyProof(publicSignals, (0, circuits_1.formatProofForSnarkjsVerification)(proof));
        tx = await unirepContract.submitEpochKeyProof(epochKeyProof);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        const epochKeyProofIndex = await unirepContract.getProofIndex(epochKeyProof.hash());
        (0, chai_1.expect)(epochKeyProof).not.equal(null);
        // 2. Submit reputation nullifiers
        const reputationNullifiers = [];
        const minRep = 0;
        const proveGraffiti = 1;
        for (let i = 0; i < config_1.maxReputationBudget; i++) {
            reputationNullifiers.push(BigInt(255));
        }
        tx = await unirepContractCalledByAttester.spendReputation([
            reputationNullifiers,
            currentEpoch.toNumber(),
            epochKey,
            (0, crypto_1.genRandomSalt)(),
            attesterId.toNumber(),
            0,
            minRep,
            proveGraffiti,
            (0, crypto_1.genRandomSalt)(),
            proof
        ], { value: config_1.attestingFee });
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.AttestationSubmitted);
        expectedEventsNumber++;
        // 3. Attest to first user
        const signedUpInLeaf = 0;
        const senderPfIdx = 0;
        let attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(1), BigInt(0), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: config_1.attestingFee });
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.AttestationSubmitted);
        expectedEventsNumber++;
        // 4. Second user sign up
        userId = (0, crypto_1.genIdentity)();
        userCommitment = (0, crypto_1.genIdentityCommitment)(userId);
        userIds.push(userId);
        userCommitments.push(userCommitment);
        tx = await unirepContract.userSignUp(userCommitment);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.UserSignedUp);
        expectedEventsNumber++;
        // 5. First epoch end
        // let numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        // expect(numEpochKey).equal(1)
        await hardhat_1.ethers.provider.send("evm_increaseTime", [config_1.epochLength]); // Fast-forward epochLength of seconds
        tx = await unirepContract.beginEpochTransition();
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        currentEpoch = await unirepContract.currentEpoch();
        expectedEventsInOrder.push(src_1.Event.EpochEnded);
        expectedEventsNumber++;
        // 6. Second user starts transition
        let transitionFromEpoch = 1;
        const epkNullifiers = [];
        const blindedHashChains = [];
        const blindedUserStates = [];
        const indexes = [];
        for (let i = 0; i < config_1.numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(BigInt(255));
            blindedHashChains.push(BigInt(255));
        }
        for (let i = 0; i < 2; i++) {
            blindedUserStates.push(BigInt(255));
        }
        tx = await unirepContract.startUserStateTransition((0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), proof);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // 7. Second user processes attestations
        tx = await unirepContract.processAttestations((0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), proof);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // 8. Second user transition
        tx = await unirepContract.updateUserStateRoot([
            (0, crypto_1.genRandomSalt)(),
            epkNullifiers,
            transitionFromEpoch,
            blindedUserStates,
            (0, crypto_1.genRandomSalt)(),
            blindedHashChains,
            (0, crypto_1.genRandomSalt)(),
            proof,
        ], indexes);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.UserStateTransitioned);
        expectedEventsNumber++;
        // 9. Attest to second user
        epochKeyNonce = 0;
        epochKey = (0, utils_1.genEpochKey)(userIds[1].getNullifier(), currentEpoch.toNumber(), epochKeyNonce);
        attestation = new utils_1.Attestation(BigInt(attesterId), BigInt(2), BigInt(1), (0, crypto_1.genRandomSalt)(), BigInt(signedUpInLeaf));
        publicSignals = [(0, crypto_1.genRandomSalt)(), currentEpoch, epochKey];
        epochKeyProof = new src_1.EpochKeyProof(publicSignals, (0, circuits_1.formatProofForSnarkjsVerification)(proof));
        tx = await unirepContractCalledByAttester.submitAttestation(attestation, epochKey, epochKeyProofIndex, senderPfIdx, { value: config_1.attestingFee });
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.AttestationSubmitted);
        expectedEventsNumber++;
        // 10. Second epoch end
        await hardhat_1.ethers.provider.send("evm_increaseTime", [config_1.epochLength]); // Fast-forward epochLength of seconds
        tx = await unirepContract.beginEpochTransition();
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        currentEpoch = await unirepContract.currentEpoch();
        expectedEventsInOrder.push(src_1.Event.EpochEnded);
        expectedEventsNumber++;
        // 11. Third epoch end
        await hardhat_1.ethers.provider.send("evm_increaseTime", [config_1.epochLength]); // Fast-forward epochLength of seconds
        tx = await unirepContract.beginEpochTransition();
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        currentEpoch = await unirepContract.currentEpoch();
        expectedEventsInOrder.push(src_1.Event.EpochEnded);
        expectedEventsNumber++;
        // 12. First user starts transition
        transitionFromEpoch = 1;
        tx = await unirepContract.startUserStateTransition((0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), proof);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // 13. First user processes attestations
        tx = await unirepContract.processAttestations((0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), proof);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // 14. First user transition
        tx = await unirepContract.updateUserStateRoot([
            (0, crypto_1.genRandomSalt)(),
            epkNullifiers,
            transitionFromEpoch,
            blindedUserStates,
            (0, crypto_1.genRandomSalt)(),
            blindedHashChains,
            (0, crypto_1.genRandomSalt)(),
            proof,
        ], indexes);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.UserStateTransitioned);
        expectedEventsNumber++;
        // 15. Second user starts transition
        transitionFromEpoch = 2;
        tx = await unirepContract.startUserStateTransition((0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), proof);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // 16. Second user processes attestations
        tx = await unirepContract.processAttestations((0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), (0, crypto_1.genRandomSalt)(), proof);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        // 17. Second user transition
        tx = await unirepContract.updateUserStateRoot([
            (0, crypto_1.genRandomSalt)(),
            epkNullifiers,
            transitionFromEpoch,
            blindedUserStates,
            (0, crypto_1.genRandomSalt)(),
            blindedHashChains,
            (0, crypto_1.genRandomSalt)(),
            proof,
        ], indexes);
        receipt = await tx.wait();
        (0, chai_1.expect)(receipt.status).equal(1);
        expectedEventsInOrder.push(src_1.Event.UserStateTransitioned);
        expectedEventsNumber++;
    });
    it('Events order should match sequencer order', async () => {
        const sequencerFilter = unirepContract.filters.Sequencer();
        const sequencerEvents = await unirepContract.queryFilter(sequencerFilter);
        (0, chai_1.expect)(sequencerEvents.length).to.be.equal(expectedEventsNumber);
        for (let i = 0; i < sequencerEvents.length; i++) {
            const event = sequencerEvents[i];
            (0, chai_1.expect)(event.args._event).equal(expectedEventsInOrder[i]);
        }
    });
});
