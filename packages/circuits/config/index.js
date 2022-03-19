"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userStateTransitionCircuitPath = exports.processAttestationsCircuitPath = exports.startTransitionCircuitPath = exports.proveUserSignUpCircuitPath = exports.proveReputationCircuitPath = exports.verifyEpochKeyCircuitPath = exports.maxReputationBudget = exports.numAttestationsPerProof = exports.numEpochKeyNoncePerEpoch = exports.circuitEpochTreeDepth = exports.circuitUserStateTreeDepth = exports.circuitGlobalStateTreeDepth = exports.Circuit = void 0;
var Circuit;
(function (Circuit) {
    Circuit["verifyEpochKey"] = "verifyEpochKey";
    Circuit["proveReputation"] = "proveReputation";
    Circuit["proveUserSignUp"] = "proveUserSignUp";
    Circuit["startTransition"] = "startTransition";
    Circuit["processAttestations"] = "processAttestations";
    Circuit["userStateTransition"] = "userStateTransition";
})(Circuit || (Circuit = {}));
exports.Circuit = Circuit;
const numEpochKeyNoncePerEpoch = 3;
exports.numEpochKeyNoncePerEpoch = numEpochKeyNoncePerEpoch;
const numAttestationsPerProof = 5;
exports.numAttestationsPerProof = numAttestationsPerProof;
const circuitGlobalStateTreeDepth = 4;
exports.circuitGlobalStateTreeDepth = circuitGlobalStateTreeDepth;
const circuitUserStateTreeDepth = 4;
exports.circuitUserStateTreeDepth = circuitUserStateTreeDepth;
const circuitEpochTreeDepth = 32;
exports.circuitEpochTreeDepth = circuitEpochTreeDepth;
const maxReputationBudget = 10;
exports.maxReputationBudget = maxReputationBudget;
const verifyEpochKeyCircuitPath = "../build/verifyEpochKey_main.circom";
exports.verifyEpochKeyCircuitPath = verifyEpochKeyCircuitPath;
const proveReputationCircuitPath = "../build/proveReputation_main.circom";
exports.proveReputationCircuitPath = proveReputationCircuitPath;
const proveUserSignUpCircuitPath = "../build/proveUserSignUp_main.circom";
exports.proveUserSignUpCircuitPath = proveUserSignUpCircuitPath;
const startTransitionCircuitPath = "../build/startTransition_main.circom";
exports.startTransitionCircuitPath = startTransitionCircuitPath;
const processAttestationsCircuitPath = "../build/processAttestations_main.circom";
exports.processAttestationsCircuitPath = processAttestationsCircuitPath;
const userStateTransitionCircuitPath = "../build/userStateTransition_main.circom";
exports.userStateTransitionCircuitPath = userStateTransitionCircuitPath;
