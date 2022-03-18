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
        this.unlock = async (eth_privkey) => {
            const ethSk = eth_privkey;
            // if (!validateEthSk(ethSk)) {
            //     console.error('Error: invalid Ethereum private key')
            //     return ''
            // }
            // if (! (await checkDeployerProviderConnection(ethSk, this.url))) {
            //     console.error('Error: unable to connect to the Ethereum provider at', this.url)
            //     return ''
            // }
            this.signer = new ethers_1.ethers.Wallet(ethSk, this.provider);
            return ethSk;
        };
        this.currentEpoch = async () => {
            return this.contract.currentEpoch();
        };
        this.epochLength = async () => {
            return this.contract.epochLength();
        };
        this.latestEpochTransitionTime = async () => {
            return this.contract.latestEpochTransitionTime();
        };
        this.emptyUserStateRoot = async () => {
            return this.contract.emptyUserStateRoot();
        };
        this.emptyGlobalStateTreeRoot = async () => {
            return this.contract.emptyGlobalStateTreeRoot();
        };
        this.numEpochKeyNoncePerEpoch = async () => {
            return this.contract.numEpochKeyNoncePerEpoch();
        };
        this.maxReputationBudget = async () => {
            return this.contract.maxReputationBudget();
        };
        this.maxUsers = async () => {
            return this.contract.maxUsers();
        };
        this.maxAttesters = async () => {
            return this.contract.maxAttesters();
        };
        this.numUserSignUps = async () => {
            return this.contract.numUserSignUps();
        };
        this.hasUserSignedUp = async (idCommitment) => {
            return this.contract.hasUserSignedUp(idCommitment);
        };
        this.attestingFee = async () => {
            return this.contract.attestingFee();
        };
        this.collectedAttestingFee = async () => {
            return this.contract.collectedAttestingFee();
        };
        this.epochTransitionCompensation = async (ethAddr) => {
            return this.contract.epochTransitionCompensation(ethAddr);
        };
        this.attesters = async (ethAddr) => {
            return this.contract.attesters(ethAddr);
        };
        this.getAttesterId = async () => {
            var _a;
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const attesterAddr = await ((_a = this.signer) === null || _a === void 0 ? void 0 : _a.getAddress());
            const attesterId = await this.attesters(attesterAddr);
            return attesterId;
        };
        this.nextAttesterId = async () => {
            return this.contract.nextAttesterId();
        };
        this.airdropAmount = async (ethAddr) => {
            return this.contract.airdropAmount(ethAddr);
        };
        this.treeDepths = async () => {
            return this.contract.treeDepths();
        };
        this.userSignUp = async (commitment) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            return await this.contract.userSignUp(commitment, { gasLimit: 1000000 });
            // let tx
            // try {
            //     tx = await this.contract.userSignUp(
            //         commitment,
            //         { gasLimit: 1000000 }
            //     )
            // } catch(e) {
            //     console.error('Error: the transaction failed')
            //     if (e) {
            //         console.error(e)
            //     }
            //     return tx
            // }
            // return tx
        };
        this.attesterSignUp = async () => {
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
        };
        this.attesterSignUpViaRelayer = async (attesterAddr, signature) => {
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
        };
        this.setAirdropAmount = async (airdropAmount) => {
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
        };
        this.submitEpochKeyProof = async (epochKeyProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: shoud connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.submitEpochKeyProof(epochKeyProof);
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return;
            }
            return tx;
        };
        this.getEpochKeyProofIndex = async (epochKeyProof) => {
            return this.contract.getProofIndex(epochKeyProof.hash());
        };
        this.getReputationProofIndex = async (reputationProof) => {
            return this.contract.getProofIndex(reputationProof.hash());
        };
        this.getSignUpProofIndex = async (signUpProof) => {
            return this.contract.getProofIndex(signUpProof.hash());
        };
        this.getStartTransitionProofIndex = async (blindedUserState, blindedHashChain, GSTreeRoot, proof) => {
            const proofNullifier = await this.contract.hashStartTransitionProof(blindedUserState, blindedHashChain, GSTreeRoot, (0, circuits_1.formatProofForVerifierContract)(proof));
            return this.contract.getProofIndex(proofNullifier);
        };
        this.getProcessAttestationsProofIndex = async (outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof) => {
            const proofNullifier = await this.contract.hashProcessAttestationsProof(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(proof));
            return this.contract.getProofIndex(proofNullifier);
        };
        this.submitAttestation = async (attestation, epochKey, toProofIndex, fromProofIndex) => {
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
                tx = await this.contract.submitAttestation(attestation, epochKey, toProofIndex, fromProofIndex, { value: attestingFee, gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return;
            }
            return tx;
        };
        this.submitAttestationViaRelayer = async (attesterAddr, signature, attestation, epochKey, toProofIndex, fromProofIndex) => {
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
                tx = await this.contract.submitAttestationViaRelayer(attesterAddr, signature, attestation, epochKey, toProofIndex, fromProofIndex, { value: attestingFee, gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return;
            }
            return tx;
        };
        this.spendReputation = async (reputationProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const signerAttesterId = await this.getAttesterId();
            if (signerAttesterId != reputationProof.attesterId) {
                console.log("Error: wrong attester ID proof");
                return;
            }
            const attestingFee = await this.contract.attestingFee();
            let tx;
            try {
                tx = await this.contract.spendReputation(reputationProof, { value: attestingFee, gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return;
            }
            return tx;
        };
        this.airdropEpochKey = async (userSignUpProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const attestingFee = await this.contract.attestingFee();
            let tx;
            try {
                tx = await this.contract.airdropEpochKey(userSignUpProof, { value: attestingFee, gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return;
            }
            return tx;
        };
        this.fastForward = async () => {
            const epochLength = (await this.contract.epochLength()).toNumber();
            await this.provider.send("evm_increaseTime", [epochLength]);
        };
        this.epochTransition = async () => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.beginEpochTransition({ gasLimit: 9000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return;
            }
            return tx;
        };
        this.startUserStateTransition = async (blindedUserState, blindedHashChain, GSTRoot, proof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.startUserStateTransition(blindedUserState, blindedHashChain, GSTRoot, (0, circuits_1.formatProofForVerifierContract)(proof));
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
            }
            return tx;
        };
        this.processAttestations = async (outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.processAttestations(outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(proof));
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
            }
            return tx;
        };
        this.updateUserStateRoot = async (USTProof, proofIndexes) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.updateUserStateRoot(USTProof, proofIndexes);
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
            }
            return tx;
        };
        this.verifyEpochKeyValidity = async (epochKeyProof) => {
            return this.contract.verifyEpochKeyValidity(epochKeyProof);
        };
        this.verifyStartTransitionProof = async (blindedUserState, blindedHashChain, GSTRoot, proof) => {
            return this.contract.verifyStartTransitionProof(blindedUserState, blindedHashChain, GSTRoot, proof);
        };
        this.verifyProcessAttestationProof = async (outputBlindedUserState, outputBlindedHashChain, intputBlindedUserState, proof) => {
            return this.contract.verifyProcessAttestationProof(outputBlindedUserState, outputBlindedHashChain, intputBlindedUserState, proof);
        };
        this.verifyUserStateTransition = async (USTProof) => {
            return this.contract.verifyUserStateTransition(USTProof);
        };
        this.verifyReputation = async (reputationProof) => {
            return this.contract.verifyReputation(reputationProof);
        };
        this.verifyUserSignUp = async (signUpProof) => {
            return this.contract.verifyUserSignUp(signUpProof);
        };
        this.hashedBlankStateLeaf = async () => {
            return this.contract.hashedBlankStateLeaf();
        };
        this.calcAirdropUSTRoot = async (leafIndex, leafValue) => {
            return this.contract.calcAirdropUSTRoot(leafIndex, leafValue);
        };
        this.burnAttestingFee = async () => {
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
        };
        this.collectEpochTransitionCompensation = async () => {
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
        };
        this.verifyProcessAttestationEvents = async (startBlindedUserState, currentBlindedUserState) => {
            const processAttestationFilter = this.contract.filter.ProcessedAttestationsProof(currentBlindedUserState);
            const processAttestationEvents = await this.contract.queryFilter(processAttestationFilter);
            if (processAttestationEvents.length == 0)
                return false;
            let returnValue = false;
            for (const event of processAttestationEvents) {
                const args = event === null || event === void 0 ? void 0 : event.args;
                const isValid = await this.contract.verifyProcessAttestationProof(args === null || args === void 0 ? void 0 : args._outputBlindedUserState, args === null || args === void 0 ? void 0 : args._outputBlindedHashChain, args === null || args === void 0 ? void 0 : args._inputBlindedUserState, args === null || args === void 0 ? void 0 : args._proof);
                if (!isValid)
                    continue;
                if ((args === null || args === void 0 ? void 0 : args._inputBlindedUserState) == startBlindedUserState)
                    returnValue = true;
                else {
                    returnValue = returnValue || await this.verifyProcessAttestationEvents(startBlindedUserState, args === null || args === void 0 ? void 0 : args._inputBlindedUserState);
                }
            }
            return returnValue;
        };
        this.url = providerUrl ? providerUrl : defaults_1.DEFAULT_ETH_PROVIDER;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(this.url);
        if (!(0, utils_1.validateEthAddress)(unirepAddress)) {
            console.error('Error: invalid Unirep contract address');
        }
        this.contract = (0, contracts_1.getUnirepContract)(unirepAddress, this.provider);
    }
}
exports.UnirepContract = UnirepContract;
