"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnirepFactory = exports.getUnirepContract = exports.deployUnirep = exports.computeProcessAttestationsProofHash = exports.computeStartTransitionProofHash = exports.UserTransitionProof = exports.SignUpProof = exports.ReputationProof = exports.EpochKeyProof = exports.Attestation = exports.AttestationEvent = exports.Event = void 0;
const ethers_1 = require("ethers");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const config_1 = require("@unirep/config");
const typechain_1 = require("../typechain");
Object.defineProperty(exports, "UnirepFactory", { enumerable: true, get: function () { return typechain_1.Unirep__factory; } });
var Event;
(function (Event) {
    Event[Event["UserSignedUp"] = 0] = "UserSignedUp";
    Event[Event["UserStateTransitioned"] = 1] = "UserStateTransitioned";
    Event[Event["AttestationSubmitted"] = 2] = "AttestationSubmitted";
    Event[Event["EpochEnded"] = 3] = "EpochEnded";
})(Event || (Event = {}));
exports.Event = Event;
var AttestationEvent;
(function (AttestationEvent) {
    AttestationEvent[AttestationEvent["SendAttestation"] = 0] = "SendAttestation";
    AttestationEvent[AttestationEvent["Airdrop"] = 1] = "Airdrop";
    AttestationEvent[AttestationEvent["SpendReputation"] = 2] = "SpendReputation";
})(AttestationEvent || (AttestationEvent = {}));
exports.AttestationEvent = AttestationEvent;
class Attestation {
    constructor(_attesterId, _posRep, _negRep, _graffiti, _signUp) {
        this.hash = () => {
            return (0, crypto_1.hash5)([
                this.attesterId.toBigInt(),
                this.posRep.toBigInt(),
                this.negRep.toBigInt(),
                this.graffiti.toBigInt(),
                this.signUp.toBigInt(),
            ]);
        };
        this.attesterId = ethers_1.ethers.BigNumber.from(_attesterId);
        this.posRep = ethers_1.ethers.BigNumber.from(_posRep);
        this.negRep = ethers_1.ethers.BigNumber.from(_negRep);
        this.graffiti = ethers_1.ethers.BigNumber.from(_graffiti);
        this.signUp = ethers_1.ethers.BigNumber.from(_signUp);
    }
}
exports.Attestation = Attestation;
// the struct EpochKeyProof in UnirepObjs
class EpochKeyProof {
    constructor(_publicSignals, _proof) {
        this.verify = () => {
            const proof_ = (0, circuits_1.formatProofForSnarkjsVerification)(this.proof.map((n) => n.toString()));
            return (0, circuits_1.verifyProof)(circuits_1.Circuit.verifyEpochKey, proof_, this.publicSignals.map((n) => BigInt(n.toString())));
        };
        this.hash = () => {
            const iface = new ethers_1.ethers.utils.Interface(typechain_1.Unirep__factory.abi);
            const abiEncoder = iface.encodeFunctionData('hashEpochKeyProof', [this]);
            return ethers_1.ethers.utils.keccak256(rmFuncSigHash(abiEncoder));
        };
        const formattedProof = (0, circuits_1.formatProofForVerifierContract)(_proof);
        this.globalStateTree = _publicSignals[0];
        this.epoch = _publicSignals[1];
        this.epochKey = _publicSignals[2];
        this.proof = formattedProof;
        this.publicSignals = _publicSignals;
    }
}
exports.EpochKeyProof = EpochKeyProof;
class ReputationProof {
    constructor(_publicSignals, _proof) {
        this.verify = () => {
            const proof_ = (0, circuits_1.formatProofForSnarkjsVerification)(this.proof.map((n) => n.toString()));
            return (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, proof_, this.publicSignals.map((n) => BigInt(n.toString())));
        };
        this.hash = () => {
            // array length should be fixed
            const abiEncoder = ethers_1.ethers.utils.defaultAbiCoder.encode([
                `tuple(uint256[${config_1.MAX_REPUTATION_BUDGET}] repNullifiers,
                    uint256 epoch,
                    uint256 epochKey, 
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 proveReputationAmount,
                    uint256 minRep,
                    uint256 proveGraffiti,
                    uint256 graffitiPreImage,
                    uint256[8] proof)
            `,
            ], [this]);
            return ethers_1.ethers.utils.keccak256(abiEncoder);
        };
        const formattedProof = (0, circuits_1.formatProofForVerifierContract)(_proof);
        this.repNullifiers = _publicSignals.slice(0, config_1.MAX_REPUTATION_BUDGET);
        this.epoch = _publicSignals[config_1.MAX_REPUTATION_BUDGET];
        this.epochKey = _publicSignals[config_1.MAX_REPUTATION_BUDGET + 1];
        this.globalStateTree = _publicSignals[config_1.MAX_REPUTATION_BUDGET + 2];
        this.attesterId = _publicSignals[config_1.MAX_REPUTATION_BUDGET + 3];
        this.proveReputationAmount = _publicSignals[config_1.MAX_REPUTATION_BUDGET + 4];
        this.minRep = _publicSignals[config_1.MAX_REPUTATION_BUDGET + 5];
        this.proveGraffiti = _publicSignals[config_1.MAX_REPUTATION_BUDGET + 6];
        this.graffitiPreImage = _publicSignals[config_1.MAX_REPUTATION_BUDGET + 7];
        this.proof = formattedProof;
        this.publicSignals = _publicSignals;
    }
}
exports.ReputationProof = ReputationProof;
class SignUpProof {
    constructor(_publicSignals, _proof) {
        this.verify = () => {
            const proof_ = (0, circuits_1.formatProofForSnarkjsVerification)(this.proof.map((n) => n.toString()));
            return (0, circuits_1.verifyProof)(circuits_1.Circuit.proveUserSignUp, proof_, this.publicSignals.map((n) => BigInt(n.toString())));
        };
        this.hash = () => {
            const iface = new ethers_1.ethers.utils.Interface(typechain_1.Unirep__factory.abi);
            const abiEncoder = iface.encodeFunctionData('hashSignUpProof', [this]);
            return ethers_1.ethers.utils.keccak256(rmFuncSigHash(abiEncoder));
        };
        const formattedProof = (0, circuits_1.formatProofForVerifierContract)(_proof);
        this.epoch = _publicSignals[0];
        this.epochKey = _publicSignals[1];
        this.globalStateTree = _publicSignals[2];
        this.attesterId = _publicSignals[3];
        this.userHasSignedUp = _publicSignals[4];
        this.proof = formattedProof;
        this.publicSignals = _publicSignals;
    }
}
exports.SignUpProof = SignUpProof;
class UserTransitionProof {
    constructor(_publicSignals, _proof) {
        this.verify = () => {
            const proof_ = (0, circuits_1.formatProofForSnarkjsVerification)(this.proof.map((n) => n.toString()));
            return (0, circuits_1.verifyProof)(circuits_1.Circuit.userStateTransition, proof_, this.publicSignals.map((n) => BigInt(n.toString())));
        };
        this.hash = () => {
            // array length should be fixed
            const abiEncoder = ethers_1.ethers.utils.defaultAbiCoder.encode([
                `tuple(uint256 newGlobalStateTreeLeaf,
                    uint256[${config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH}] epkNullifiers,
                    uint256 transitionFromEpoch,
                    uint256[2] blindedUserStates,
                    uint256 fromGlobalStateTree,
                    uint256[${config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH}] blindedHashChains,
                    uint256 fromEpochTree,
                    uint256[8] proof)
            `,
            ], [this]);
            return ethers_1.ethers.utils.keccak256(abiEncoder);
        };
        const formattedProof = (0, circuits_1.formatProofForVerifierContract)(_proof);
        this.newGlobalStateTreeLeaf = _publicSignals[0];
        this.epkNullifiers = [];
        this.blindedUserStates = [];
        this.blindedHashChains = [];
        for (let i = 0; i < config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i]);
        }
        this.transitionFromEpoch = _publicSignals[1 + config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH];
        this.blindedUserStates.push(_publicSignals[2 + config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH]);
        this.blindedUserStates.push(_publicSignals[3 + config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH]);
        this.fromGlobalStateTree = _publicSignals[4 + config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH];
        for (let i = 0; i < config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            this.blindedHashChains.push(_publicSignals[5 + config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH + i]);
        }
        this.fromEpochTree = _publicSignals[5 + config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH * 2];
        this.proof = formattedProof;
        this.publicSignals = _publicSignals;
    }
}
exports.UserTransitionProof = UserTransitionProof;
const computeStartTransitionProofHash = (blindedUserState, blindedHashChain, globalStateTree, proof) => {
    const iface = new ethers_1.ethers.utils.Interface(typechain_1.Unirep__factory.abi);
    const abiEncoder = iface.encodeFunctionData('hashStartTransitionProof', [
        blindedUserState,
        blindedHashChain,
        globalStateTree,
        proof,
    ]);
    return ethers_1.ethers.utils.keccak256(rmFuncSigHash(abiEncoder));
};
exports.computeStartTransitionProofHash = computeStartTransitionProofHash;
const computeProcessAttestationsProofHash = (outputBlindedUserState, outputBlindedHashChain, inputBlindedUserState, proof) => {
    const iface = new ethers_1.ethers.utils.Interface(typechain_1.Unirep__factory.abi);
    const abiEncoder = iface.encodeFunctionData('hashProcessAttestationsProof', [
        outputBlindedUserState,
        outputBlindedHashChain,
        inputBlindedUserState,
        proof,
    ]);
    return ethers_1.ethers.utils.keccak256(rmFuncSigHash(abiEncoder));
};
exports.computeProcessAttestationsProofHash = computeProcessAttestationsProofHash;
const rmFuncSigHash = (abiEncoder) => {
    return '0x' + abiEncoder.slice(10);
};
const deployUnirep = async (deployer, _treeDepths, _settings) => {
    let EpochKeyValidityVerifierContract;
    let StartTransitionVerifierContract;
    let ProcessAttestationsVerifierContract;
    let UserStateTransitionVerifierContract;
    let ReputationVerifierContract;
    let UserSignUpVerifierContract;
    console.log('Deploying EpochKeyValidityVerifier');
    EpochKeyValidityVerifierContract =
        await new typechain_1.EpochKeyValidityVerifier__factory(deployer).deploy();
    await EpochKeyValidityVerifierContract.deployTransaction.wait();
    console.log('Deploying StartTransitionVerifier');
    StartTransitionVerifierContract =
        await new typechain_1.StartTransitionVerifier__factory(deployer).deploy();
    await StartTransitionVerifierContract.deployTransaction.wait();
    console.log('Deploying ProcessAttestationsVerifier');
    ProcessAttestationsVerifierContract =
        await new typechain_1.ProcessAttestationsVerifier__factory(deployer).deploy();
    await ProcessAttestationsVerifierContract.deployTransaction.wait();
    console.log('Deploying UserStateTransitionVerifier');
    UserStateTransitionVerifierContract =
        await new typechain_1.UserStateTransitionVerifier__factory(deployer).deploy();
    await UserStateTransitionVerifierContract.deployTransaction.wait();
    console.log('Deploying ReputationVerifier');
    ReputationVerifierContract = await new typechain_1.ReputationVerifier__factory(deployer).deploy();
    await ReputationVerifierContract.deployTransaction.wait();
    console.log('Deploying UserSignUpVerifier');
    UserSignUpVerifierContract = await new typechain_1.UserSignUpVerifier__factory(deployer).deploy();
    await UserSignUpVerifierContract.deployTransaction.wait();
    console.log('Deploying Unirep');
    let _maxUsers, _maxAttesters, _numEpochKeyNoncePerEpoch, _maxReputationBudget, _epochLength, _attestingFee;
    if (_settings) {
        _maxUsers = _settings.maxUsers;
        (_maxAttesters = _settings.maxAttesters),
            (_numEpochKeyNoncePerEpoch = _settings.numEpochKeyNoncePerEpoch);
        _maxReputationBudget = _settings.maxReputationBudget;
        _epochLength = _settings.epochLength;
        _attestingFee = _settings.attestingFee;
    }
    else {
        _maxUsers = config_1.MAX_USERS;
        _maxAttesters = config_1.MAX_ATTESTERS;
        _numEpochKeyNoncePerEpoch = config_1.NUM_EPOCH_KEY_NONCE_PER_EPOCH;
        _maxReputationBudget = config_1.MAX_REPUTATION_BUDGET;
        _epochLength = config_1.EPOCH_LENGTH;
        _attestingFee = config_1.ATTESTTING_FEE;
    }
    const c = await new typechain_1.Unirep__factory(deployer).deploy(_treeDepths, {
        maxUsers: _maxUsers,
        maxAttesters: _maxAttesters,
    }, EpochKeyValidityVerifierContract.address, StartTransitionVerifierContract.address, ProcessAttestationsVerifierContract.address, UserStateTransitionVerifierContract.address, ReputationVerifierContract.address, UserSignUpVerifierContract.address, _numEpochKeyNoncePerEpoch, _maxReputationBudget, _epochLength, _attestingFee);
    await c.deployTransaction.wait();
    // Print out deployment info
    console.log('-----------------------------------------------------------------');
    console.log('Bytecode size of Unirep:', Math.floor(typechain_1.Unirep__factory.bytecode.length / 2), 'bytes');
    let receipt = await c.provider.getTransactionReceipt(c.deployTransaction.hash);
    console.log('Gas cost of deploying Unirep:', receipt.gasUsed.toString());
    console.log('-----------------------------------------------------------------');
    return c;
};
exports.deployUnirep = deployUnirep;
const getUnirepContract = (addressOrName, signerOrProvider) => {
    return new ethers_1.ethers.Contract(addressOrName, typechain_1.Unirep__factory.abi, signerOrProvider);
};
exports.getUnirepContract = getUnirepContract;
