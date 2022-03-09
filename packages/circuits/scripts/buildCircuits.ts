import * as fs from 'fs'
import * as path from 'path'
import { circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, circuitEpochTreeDepth, numEpochKeyNoncePerEpoch, numAttestationsPerProof, maxReputationBudget, verifyEpochKeyCircuitPath, proveReputationCircuitPath, proveUserSignUpCircuitPath, startTransitionCircuitPath, processAttestationsCircuitPath, userStateTransitionCircuitPath, } from '../config'

const main = async () => {
    let testCircuitContent
    let dirPath
    let circomPath

    // verifyEpochKey circuit
    dirPath = path.join(__dirname, '../build')
    circomPath = path.join(__dirname, verifyEpochKeyCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/verifyEpochKey.circom" \n\ncomponent main = VerifyEpochKey(${circuitGlobalStateTreeDepth}, ${circuitEpochTreeDepth}, ${numEpochKeyNoncePerEpoch})`

    try{
        fs.mkdirSync(dirPath, { recursive: true })
    } catch(e){
        console.log('Cannot create folder ', e);
    }
    fs.writeFileSync(circomPath, testCircuitContent)


    // proveRepuation circuit
    dirPath = path.join(__dirname, '../build')
    circomPath = path.join(__dirname, proveReputationCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/proveReputation.circom" \n\ncomponent main = ProveReputation(${circuitGlobalStateTreeDepth}, ${circuitUserStateTreeDepth}, ${circuitEpochTreeDepth}, ${numEpochKeyNoncePerEpoch}, ${maxReputationBudget}, 252)`

    try{
        fs.mkdirSync(dirPath, { recursive: true })
    } catch(e){
        console.log('Cannot create folder ', e);
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    // proveUserSignUp circuit
    dirPath = path.join(__dirname, '../build')
    circomPath = path.join(__dirname, proveUserSignUpCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/proveUserSignUp.circom" \n\ncomponent main = ProveUserSignUp(${circuitGlobalStateTreeDepth}, ${circuitUserStateTreeDepth}, ${circuitEpochTreeDepth}, ${numEpochKeyNoncePerEpoch})`

    try{
        fs.mkdirSync(dirPath, { recursive: true })
    } catch(e){
        console.log('Cannot create folder ', e);
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    
    // startTransition circuit
    dirPath = path.join(__dirname, '../build')
    circomPath = path.join(__dirname, startTransitionCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/startTransition.circom" \n\ncomponent main = StartTransition(${circuitGlobalStateTreeDepth})`

    try{
        fs.mkdirSync(dirPath, { recursive: true })
    } catch(e){
        console.log('Cannot create folder ', e);
    }
    fs.writeFileSync(circomPath, testCircuitContent)


    // processAttestations circuit
    dirPath = path.join(__dirname, '../build')
    circomPath = path.join(__dirname, processAttestationsCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/processAttestations.circom" \n\ncomponent main = ProcessAttestations(${circuitUserStateTreeDepth}, ${numAttestationsPerProof}, ${numEpochKeyNoncePerEpoch})`

    try{
        fs.mkdirSync(dirPath, { recursive: true })
    } catch(e){
        console.log('Cannot create folder ', e);
    }
    fs.writeFileSync(circomPath, testCircuitContent)


    // userStateTransition circuit
    dirPath = path.join(__dirname, '../build')
    circomPath = path.join(__dirname, userStateTransitionCircuitPath)

    // create .circom file
    testCircuitContent = `include "../circuits/userStateTransition.circom" \n\ncomponent main = UserStateTransition(${circuitGlobalStateTreeDepth}, ${circuitEpochTreeDepth}, ${circuitUserStateTreeDepth}, ${numEpochKeyNoncePerEpoch})`

    try{
        fs.mkdirSync(dirPath, { recursive: true })
    } catch(e){
        console.log('Cannot create folder ', e);
    }
    fs.writeFileSync(circomPath, testCircuitContent)

    return 0
}

(async () => {
    let exitCode;
    try {
        exitCode = await main();
    } catch (err) {
        console.error(err)
        exitCode = 1
    }
    process.exit(exitCode)
})();