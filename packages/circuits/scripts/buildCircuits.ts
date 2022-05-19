import * as fs from 'fs'
import * as path from 'path'
import { Path } from 'typescript'
import config from '../config'
import { CircuitName } from '../src'

const buildVerifyEpochKeyCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.verifyEpochKey}_main.circom`
    )
    // create .circom file
    const circuitContent = `
        include "../circuits/verifyEpochKey.circom" \n\n
        component main = VerifyEpochKey(
            ${config.globalStateTreeDepth}, 
            ${config.epochTreeDepth}, 
            ${config.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildProveRepuationCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.proveReputation}_main.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/proveReputation.circom" \n\n
        component main = ProveReputation(
            ${config.globalStateTreeDepth}, 
            ${config.userStateTreeDepth}, 
            ${config.epochTreeDepth}, 
            ${config.numEpochKeyNoncePerEpoch}, 
            ${config.maxReputationBudget}, 
            252
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildProveSignUpCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.proveUserSignUp}_main.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/proveUserSignUp.circom" \n\n
        component main = ProveUserSignUp(
            ${config.globalStateTreeDepth}, 
            ${config.userStateTreeDepth}, 
            ${config.epochTreeDepth}, 
            ${config.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildStartTransitionCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.startTransition}_main.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/startTransition.circom" \n\n
        component main = StartTransition(
            ${config.globalStateTreeDepth}
        )
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildProcessAttestationsCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.processAttestations}_main.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/processAttestations.circom" \n\n
        component main = ProcessAttestations(
            ${config.userStateTreeDepth}, 
            ${config.numAttestationsPerProof}, 
            ${config.numEpochKeyNoncePerEpoch}
        )
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildUserStateTransitionCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.userStateTransition}_main.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/userStateTransition.circom" \n\n
        component main = UserStateTransition(
            ${config.globalStateTreeDepth}, 
            ${config.epochTreeDepth}, 
            ${config.userStateTreeDepth}, 
            ${config.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const main = async (): Promise<number> => {
    const dirPath: Path = config.exportBuildPath
    const configPath = path.join(dirPath, 'config.json')

    // build export zk files folder
    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }

    // verifyEpochKey circuit
    buildVerifyEpochKeyCircuit(dirPath)

    // proveRepuation circuit
    buildProveRepuationCircuit(dirPath)

    // proveUserSignUp circuit
    buildProveSignUpCircuit(dirPath)

    // startTransition circuit
    buildStartTransitionCircuit(dirPath)

    // processAttestations circuit
    buildProcessAttestationsCircuit(dirPath)

    // userStateTransition circuit
    buildUserStateTransitionCircuit(dirPath)

    fs.writeFileSync(configPath, JSON.stringify(config))

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
