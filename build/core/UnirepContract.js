"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnirepContract = void 0;
const ethers_1 = require("ethers");
const contracts_1 = require("@unirep/contracts");
const circuits_1 = require("@unirep/circuits");
const defaults_1 = require("../cli/defaults");
const utils_1 = require("../cli/utils");
/**
 * An API module of Unirep contracts.
 * All contract-interacting domain logic should be defined in here.
 */
class UnirepContract {
    constructor(unirepAddress, providerUrl) {
        this.url = providerUrl ? providerUrl : defaults_1.DEFAULT_ETH_PROVIDER;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(this.url);
        if (!utils_1.validateEthAddress(unirepAddress)) {
            console.error('Error: invalid Unirep contract address');
        }
        this.contract = contracts_1.getUnirepContract(unirepAddress, this.provider);
    }
    async unlock(eth_privkey) {
        let ethSk;
        // The deployer's Ethereum private key
        // The user may either enter it as a command-line option or via the
        // standard input
        if (eth_privkey) {
            ethSk = eth_privkey;
        }
        else {
            ethSk = await utils_1.promptPwd('Your Ethereum private key');
        }
        if (!utils_1.validateEthSk(ethSk)) {
            console.error('Error: invalid Ethereum private key');
            return '';
        }
        if (!(await utils_1.checkDeployerProviderConnection(ethSk, this.url))) {
            console.error('Error: unable to connect to the Ethereum provider at', this.url);
            return '';
        }
        this.signer = new ethers_1.ethers.Wallet(ethSk, this.provider);
        return ethSk;
    }
    async currentEpoch() {
        return this.contract.currentEpoch();
    }
    async epochLength() {
        return this.contract.epochLength();
    }
    async latestEpochTransitionTime() {
        return this.contract.latestEpochTransitionTime();
    }
    async emptyUserStateRoot() {
        return this.contract.emptyUserStateRoot();
    }
    async emptyGlobalStateTreeRoot() {
        return this.contract.emptyGlobalStateTreeRoot();
    }
    async numEpochKeyNoncePerEpoch() {
        return this.contract.numEpochKeyNoncePerEpoch();
    }
    async maxReputationBudget() {
        return this.contract.maxReputationBudget();
    }
    async maxUsers() {
        return this.contract.maxUsers();
    }
    async numUserSignUps() {
        return this.contract.numUserSignUps();
    }
    async hasUserSignedUp(idCommitment) {
        return this.contract.hasUserSignedUp(idCommitment);
    }
    async attestingFee() {
        return this.contract.attestingFee();
    }
    async collectedAttestingFee() {
        return this.contract.collectedAttestingFee();
    }
    async epochTransitionCompensation(ethAddr) {
        return this.contract.epochTransitionCompensation(ethAddr);
    }
    async attesters(ethAddr) {
        return this.contract.attesters(ethAddr);
    }
    async nextAttesterId() {
        return this.contract.nextAttesterId();
    }
    async isEpochKeyHashChainSealed(epochKey) {
        return this.contract.isEpochKeyHashChainSealed(epochKey);
    }
    async epochKeyHashchain(epochKey) {
        return this.contract.epochKeyHashchain(epochKey);
    }
    async airdropAmount(ethAddr) {
        return this.contract.airdropAmount(ethAddr);
    }
    async treeDepths() {
        return this.contract.treeDepths();
    }
    async getNumEpochKey(epoch) {
        return this.contract.getNumEpochKey(epoch);
    }
    async getNumSealedEpochKey(epoch) {
        return this.contract.getNumSealedEpochKey(epoch);
    }
    async getEpochKey(epoch, index) {
        return this.contract.getEpochKey(epoch);
    }
    async userSignUp(commitment) {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.userSignUp(commitment, { gasLimit: 1000000 });
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return tx;
        }
        return tx;
    }
    async attesterSignUp() {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.attesterSignUp();
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return;
        }
        return tx;
    }
    async attesterSignUpViaRelayer(attesterAddr, signature) {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.attesterSignUpViaRelayer(attesterAddr, signature);
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return;
        }
        return tx;
    }
    async setAirdropAmount(airdropAmount) {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.setAirdropAmount(airdropAmount);
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return;
        }
        return tx;
    }
    async submitAttestation(attestation, epochKey) {
        var _a;
        if (this.signer != undefined) {
            const attesterAddr = await ((_a = this.signer) === null || _a === void 0 ? void 0 : _a.getAddress());
            const attesterExist = await this.attesters(attesterAddr);
            if (attesterExist.toNumber() == 0) {
                console.error('Error: attester has not registered yet');
                return;
            }
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: shoud connect a signer");
            return;
        }
        const attestingFee = await this.contract.attestingFee();
        let tx;
        try {
            tx = await this.contract.submitAttestation(attestation, epochKey, { value: attestingFee, gasLimit: 1000000 });
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return;
        }
        return tx;
    }
    async submitAttestationViaRelayer(attesterAddr, signature, attestation, epochKey) {
        if (this.signer != undefined) {
            const attesterExist = await this.attesters(attesterAddr);
            if (attesterExist.toNumber() == 0) {
                console.error('Error: attester has not registered yet');
                return;
            }
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: shoud connect a signer");
            return;
        }
        const attestingFee = await this.contract.attestingFee();
        let tx;
        try {
            tx = await this.contract.submitAttestationViaRelayer(attesterAddr, signature, attestation, epochKey, { value: attestingFee, gasLimit: 1000000 });
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return;
        }
        return tx;
    }
    async submitReputationNullifiers(outputNullifiers, epoch, epk, GSTRoot, attesterId, repNullifiersAmount, minRep, proveGraffiti, graffitiPreImage, proof) {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.submitReputationNullifiers(outputNullifiers, epoch, epk, GSTRoot, attesterId, repNullifiersAmount, minRep, proveGraffiti, graffitiPreImage, proof, { gasLimit: 100000 });
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return;
        }
        return tx;
    }
    async fastForward() {
        const epochLength = (await this.contract.epochLength()).toNumber();
        await this.provider.send("evm_increaseTime", [epochLength]);
    }
    async epochTransition() {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        const currentEpoch = await this.currentEpoch();
        let tx;
        try {
            const numEpochKeysToSeal = await this.contract.getNumEpochKey(currentEpoch);
            tx = await this.contract.beginEpochTransition(numEpochKeysToSeal, { gasLimit: 9000000 });
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
            return;
        }
        return tx;
    }
    async startUserStateTransition(blindedUserState, blindedHashChain, GSTRoot, proof) {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.startUserStateTransition(blindedUserState, blindedHashChain, GSTRoot, circuits_1.formatProofForVerifierContract(proof));
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
        }
        return tx;
    }
    async processAttestations(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof) {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.processAttestations(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, circuits_1.formatProofForVerifierContract(proof));
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
        }
        return tx;
    }
    async updateUserStateRoot(newGSTLeaf, epochKeyNullifiers, blindedUserStates, blindedHashChains, transitionedFromEpoch, fromGSTRoot, fromEpochTree, proof) {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.updateUserStateRoot(newGSTLeaf, epochKeyNullifiers, blindedUserStates, blindedHashChains, transitionedFromEpoch, fromGSTRoot, fromEpochTree, circuits_1.formatProofForVerifierContract(proof));
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
        }
        return tx;
    }
    async verifyEpochKeyValidity(GSTRoot, currentEpoch, epk, proof) {
        return this.contract.verifyEpochKeyValidity(GSTRoot, currentEpoch, epk, proof);
    }
    async verifyStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof) {
        return this.contract.verifyStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof);
    }
    async verifyProcessAttestationProof(outputBlindedUserState, outputBlindedHashChain, intputBlindedUserState, proof) {
        return this.contract.verifyProcessAttestationProof(outputBlindedUserState, outputBlindedHashChain, intputBlindedUserState, proof);
    }
    async verifyUserStateTransition(newGSTLeaf, epkNullifiers, fromEpoch, blindedUserStates, fromGlobalStateTree, blindedHashChains, fromEpochTree, proof) {
        return this.contract.verifyUserStateTransition(newGSTLeaf, epkNullifiers, fromEpoch, blindedUserStates, fromGlobalStateTree, blindedHashChains, fromEpochTree, proof);
    }
    async verifyReputation(outputNullifiers, epoch, epk, GSTRoot, attesterId, repNullifiersAmount, minRep, proveGraffiti, graffitiPreImage, proof) {
        return this.contract.verifyReputation(outputNullifiers, epoch, epk, GSTRoot, attesterId, repNullifiersAmount, minRep, proveGraffiti, graffitiPreImage, proof);
    }
    async verifyUserSignUp(epoch, epk, GSTRoot, attesterId, proof) {
        return this.contract.verifyUserSignUp(epoch, epk, GSTRoot, attesterId, proof);
    }
    async hashedBlankStateLeaf() {
        return this.contract.hashedBlankStateLeaf();
    }
    async calcAirdropUSTRoot(leafIndex, leafValue) {
        return this.contract.calcAirdropUSTRoot(leafIndex, leafValue);
    }
    async getEpochTreeLeaves(epoch) {
        return this.contract.getEpochTreeLeaves(epoch);
    }
    async burnAttestingFee() {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.burnAttestingFee();
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
        }
        return tx;
    }
    async collectEpochTransitionCompensation() {
        if (this.signer != undefined) {
            this.contract = this.contract.connect(this.signer);
        }
        else {
            console.log("Error: should connect a signer");
            return;
        }
        let tx;
        try {
            tx = await this.contract.collectEpochTransitionCompensation();
        }
        catch (e) {
            console.error('Error: the transaction failed');
            if (e) {
                console.error(e);
            }
        }
        return tx;
    }
}
exports.UnirepContract = UnirepContract;
