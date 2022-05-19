import * as fs from 'fs'
import * as path from 'path'
import { Path } from 'typescript'
import { CircuitConfig, CircuitName } from '../src'

// make the circuit size smaller
export const testConfig = {
    exportBuildPath: path.join(__dirname, '../circuits/test'),
    globalStateTreeDepth: 4,
    userStateTreeDepth: 4,
    epochTreeDepth: 8,
    numEpochKeyNoncePerEpoch: 3,
    maxReputationBudget: 10,
    numAttestationsPerProof: 5,
} as CircuitConfig

const buildEpochKeyExistsCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `epochKeyExists_test.circom`
    )
    const circuitContent = `
        include "../userStateTransition.circom"
        component main = EpochKeyExist(${testConfig.epochTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildHash5Circuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `hasher5_test.circom`
    )
    const circuitContent = `
        include "../hasherPoseidon.circom"
        component main = Hasher5();
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildHashLeftRightCircuit  = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `hashleftright_test.circom`
    )
    const circuitContent = `
        include "../hasherPoseidon.circom"
        component main = HashLeftRight();
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildIdCommitmentCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `identityCommitment_test.circom`
    )
    const circuitContent = `
        include "../identityCommitment.circom"
        component main = IdentityCommitment();
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildMerkleTreeInclusionProofCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `merkleTreeInclusionProof_test.circom`
    )
    const circuitContent = `
        include "../incrementalMerkleTree.circom"
        component main = MerkleTreeInclusionProof(${testConfig.globalStateTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildMerkleTreeLeafExistsCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `merkleTreeLeafExists_test.circom`
    )
    const circuitContent = `
        include "../incrementalMerkleTree.circom"
        component main = LeafExists(${testConfig.globalStateTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildSMTInclustionProofCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `smtInclusionProof_test.circom`
    )
    const circuitContent = `
        include "../sparseMerkleTree.circom"
        component main = SMTInclusionProof(${testConfig.epochTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildSMTLeafExistsCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `smtLeafExists_test.circom`
    )
    const circuitContent = `
        include "../sparseMerkleTree.circom"
        component main = SMTLeafExists(${testConfig.epochTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildVerifyHashChainCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `verifyHashChain_test.circom`
    )
    const circuitContent = `
        include "../verifyHashChain.circom"
        component main = VerifyHashChain(${testConfig.numAttestationsPerProof});
    `
    fs.writeFileSync(circomPath, circuitContent)
}


const buildVerifyEpochKeyCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.verifyEpochKey}_test.circom`
    )
    // create .circom file
    const circuitContent = `
        include "../circuits/verifyEpochKey.circom" \n\n
        component main = VerifyEpochKey(
            ${testConfig.globalStateTreeDepth}, 
            ${testConfig.epochTreeDepth}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildProveRepuationCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.proveReputation}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/proveReputation.circom" \n\n
        component main = ProveReputation(
            ${testConfig.globalStateTreeDepth}, 
            ${testConfig.userStateTreeDepth}, 
            ${testConfig.epochTreeDepth}, 
            ${testConfig.numEpochKeyNoncePerEpoch}, 
            ${testConfig.maxReputationBudget}, 
            252
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildProveSignUpCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.proveUserSignUp}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/proveUserSignUp.circom" \n\n
        component main = ProveUserSignUp(
            ${testConfig.globalStateTreeDepth}, 
            ${testConfig.userStateTreeDepth}, 
            ${testConfig.epochTreeDepth}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildStartTransitionCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.startTransition}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/startTransition.circom" \n\n
        component main = StartTransition(
            ${testConfig.globalStateTreeDepth}
        )
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildProcessAttestationsCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.processAttestations}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/processAttestations.circom" \n\n
        component main = ProcessAttestations(
            ${testConfig.userStateTreeDepth}, 
            ${testConfig.numAttestationsPerProof}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildUserStateTransitionCircuit = (dirPath: Path) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.userStateTransition}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../circuits/userStateTransition.circom" \n\n
        component main = UserStateTransition(
            ${testConfig.globalStateTreeDepth}, 
            ${testConfig.epochTreeDepth}, 
            ${testConfig.userStateTreeDepth}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const main = async (): Promise<number> => {
    const dirPath: Path = testConfig.exportBuildPath
    const configPath = path.join(dirPath, 'testConfig.json')

    // build export zk files folder
    try {
        fs.mkdirSync(dirPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }

    buildEpochKeyExistsCircuit(dirPath)
    buildHash5Circuit(dirPath)
    buildHashLeftRightCircuit(dirPath)
    buildIdCommitmentCircuit(dirPath)
    buildMerkleTreeInclusionProofCircuit(dirPath)
    buildMerkleTreeLeafExistsCircuit(dirPath)
    buildSMTInclustionProofCircuit(dirPath)
    buildSMTLeafExistsCircuit(dirPath)
    buildVerifyHashChainCircuit(dirPath)
    buildVerifyEpochKeyCircuit(dirPath)

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

    fs.writeFileSync(configPath, JSON.stringify(testConfig))

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
