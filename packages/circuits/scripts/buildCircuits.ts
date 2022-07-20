import * as fs from 'fs'
import * as path from 'path'

import {
    processAttestationsCircuitPath,
    proveReputationCircuitPath,
    proveNegativeReputationCircuitPath,
    proveUserSignUpCircuitPath,
    startTransitionCircuitPath,
    userStateTransitionCircuitPath,
    verifyEpochKeyCircuitPath,
    NUM_ATTESTATIONS_PER_PROOF,
    MAX_REPUTATION_BUDGET,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../config'

const main = async (): Promise<number> => {
    let testCircuitContent
    let dirPath
    let circomPath

    // verifyEpochKey circuit
    dirPath = path.join(__dirname, '../zksnarkBuild')
    circomPath = path.join(__dirname, verifyEpochKeyCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/verifyEpochKey.circom" \n\ncomponent main = VerifyEpochKey(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`

    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    // proveRepuation circuit
    dirPath = path.join(__dirname, '../zksnarkBuild')
    circomPath = path.join(__dirname, proveReputationCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/proveReputation.circom" \n\ncomponent main = ProveReputation(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${MAX_REPUTATION_BUDGET}, 252)`

    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    // proveNegativeReputation circuit
    dirPath = path.join(__dirname, '../zksnarkBuild')
    circomPath = path.join(__dirname, proveNegativeReputationCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/proveNegativeReputation.circom" \n\ncomponent main = ProveNegativeReputation(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252)`

    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    // proveUserSignUp circuit
    dirPath = path.join(__dirname, '../zksnarkBuild')
    circomPath = path.join(__dirname, proveUserSignUpCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/proveUserSignUp.circom" \n\ncomponent main = ProveUserSignUp(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`

    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    // startTransition circuit
    dirPath = path.join(__dirname, '../zksnarkBuild')
    circomPath = path.join(__dirname, startTransitionCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/startTransition.circom" \n\ncomponent main = StartTransition(${GLOBAL_STATE_TREE_DEPTH})`

    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    // processAttestations circuit
    dirPath = path.join(__dirname, '../zksnarkBuild')
    circomPath = path.join(__dirname, processAttestationsCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/processAttestations.circom" \n\ncomponent main = ProcessAttestations(${USER_STATE_TREE_DEPTH}, ${NUM_ATTESTATIONS_PER_PROOF}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`

    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    // userStateTransition circuit
    dirPath = path.join(__dirname, '../zksnarkBuild')
    circomPath = path.join(__dirname, userStateTransitionCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/userStateTransition.circom" \n\ncomponent main = UserStateTransition(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`

    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    return 0
}

void (async () => {
    let exitCode
    try {
        exitCode = await main()
    } catch (err) {
        console.error(err)
        exitCode = 1
    }
    process.exit(exitCode)
})()
