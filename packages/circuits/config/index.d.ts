declare enum Circuit {
    verifyEpochKey = "verifyEpochKey",
    proveReputation = "proveReputation",
    proveUserSignUp = "proveUserSignUp",
    startTransition = "startTransition",
    processAttestations = "processAttestations",
    userStateTransition = "userStateTransition"
}
declare const numEpochKeyNoncePerEpoch = 3;
declare const numAttestationsPerProof = 5;
declare const circuitGlobalStateTreeDepth = 4;
declare const circuitUserStateTreeDepth = 4;
declare const circuitEpochTreeDepth = 32;
declare const maxReputationBudget = 10;
declare const verifyEpochKeyCircuitPath = "../build/verifyEpochKey_main.circom";
declare const proveReputationCircuitPath = "../build/proveReputation_main.circom";
declare const proveUserSignUpCircuitPath = "../build/proveUserSignUp_main.circom";
declare const startTransitionCircuitPath = "../build/startTransition_main.circom";
declare const processAttestationsCircuitPath = "../build/processAttestations_main.circom";
declare const userStateTransitionCircuitPath = "../build/userStateTransition_main.circom";
export { Circuit, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, circuitEpochTreeDepth, numEpochKeyNoncePerEpoch, numAttestationsPerProof, maxReputationBudget, verifyEpochKeyCircuitPath, proveReputationCircuitPath, proveUserSignUpCircuitPath, startTransitionCircuitPath, processAttestationsCircuitPath, userStateTransitionCircuitPath, };
