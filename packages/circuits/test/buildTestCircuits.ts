import * as fs from 'fs'
import * as path from 'path'

import { CircuitConfig, CircuitName } from '../src'
const snarkjs = require('snarkjs')
const compiler = require('circom').compiler
const fastFile = require('fastfile')

import { ptau } from '../scripts/config'
import { stringifyBigInts } from '@unirep/crypto'

export const exportBuildPath = path.join(__dirname, '../circuits/test')
// make the circuit size smaller
export const testConfig = {
    globalStateTreeDepth: 4,
    userStateTreeDepth: 4,
    epochTreeDepth: 8,
    numEpochKeyNoncePerEpoch: 3,
    maxReputationBudget: 10,
    numAttestationsPerProof: 5,
} as CircuitConfig

const buildEpochKeyExistsCircuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `epochKeyExists_test.circom`)
    const circuitContent = `
        include "../userStateTransition.circom"
        component main = EpochKeyExist(${testConfig.epochTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildHash5Circuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `hasher5_test.circom`)
    const circuitContent = `
        include "../hasherPoseidon.circom"
        component main = Hasher5();
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildHashLeftRightCircuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `hashleftright_test.circom`)
    const circuitContent = `
        include "../hasherPoseidon.circom"
        component main = HashLeftRight();
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildIdCommitmentCircuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `identityCommitment_test.circom`)
    const circuitContent = `
        include "../identityCommitment.circom"
        component main = IdentityCommitment();
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildMerkleTreeInclusionProofCircuit = (dirPath: string) => {
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

const buildMerkleTreeLeafExistsCircuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `merkleTreeLeafExists_test.circom`)
    const circuitContent = `
        include "../incrementalMerkleTree.circom"
        component main = LeafExists(${testConfig.globalStateTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildSMTInclustionProofCircuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `smtInclusionProof_test.circom`)
    const circuitContent = `
        include "../sparseMerkleTree.circom"
        component main = SMTInclusionProof(${testConfig.epochTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildSMTLeafExistsCircuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `smtLeafExists_test.circom`)
    const circuitContent = `
        include "../sparseMerkleTree.circom"
        component main = SMTLeafExists(${testConfig.epochTreeDepth});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildVerifyHashChainCircuit = (dirPath: string) => {
    const circomPath = path.join(dirPath, `verifyHashChain_test.circom`)
    const circuitContent = `
        include "../verifyHashChain.circom"
        component main = VerifyHashChain(${testConfig.numAttestationsPerProof});
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildVerifyEpochKeyCircuit = (dirPath: string) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.verifyEpochKey}_test.circom`
    )
    // create .circom file
    const circuitContent = `
        include "../verifyEpochKey.circom" \n\n
        component main = VerifyEpochKey(
            ${testConfig.globalStateTreeDepth}, 
            ${testConfig.epochTreeDepth}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildProveRepuationCircuit = (dirPath: string) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.proveReputation}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../proveReputation.circom" \n\n
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

const buildProveSignUpCircuit = (dirPath: string) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.proveUserSignUp}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../proveUserSignUp.circom" \n\n
        component main = ProveUserSignUp(
            ${testConfig.globalStateTreeDepth}, 
            ${testConfig.userStateTreeDepth}, 
            ${testConfig.epochTreeDepth}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const buildStartTransitionCircuit = (dirPath: string) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.startTransition}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../startTransition.circom" \n\n
        component main = StartTransition(
            ${testConfig.globalStateTreeDepth}
        )
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildProcessAttestationsCircuit = (dirPath: string) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.processAttestations}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../processAttestations.circom" \n\n
        component main = ProcessAttestations(
            ${testConfig.userStateTreeDepth}, 
            ${testConfig.numAttestationsPerProof}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `
    fs.writeFileSync(circomPath, circuitContent)
}

const buildUserStateTransitionCircuit = async (dirPath: string) => {
    const circomPath = path.join(
        dirPath,
        `${CircuitName.userStateTransition}_test.circom`
    )

    // create .circom file
    const circuitContent = `
        include "../userStateTransition.circom" \n\n
        component main = UserStateTransition(
            ${testConfig.globalStateTreeDepth}, 
            ${testConfig.epochTreeDepth}, 
            ${testConfig.userStateTreeDepth}, 
            ${testConfig.numEpochKeyNoncePerEpoch}
        )
    `

    fs.writeFileSync(circomPath, circuitContent)
}

const fileExists = (filepath: string): boolean => {
    return fs.existsSync(filepath)
}

const generateProvingKey = async () => {
    console.log('Building circuits')
    for (const circuit of Object.keys(CircuitName)) {
        const buildPath = exportBuildPath
        const circomFile = path.join(buildPath, `${circuit}_test.circom`)
        const R1CSFile = path.join(buildPath, `${circuit}.r1cs`)
        const symFile = path.join(buildPath, `${circuit}.sym`)
        const wasmFile = path.join(buildPath, `${circuit}.wasm`)
        const zkey = path.join(buildPath, `${circuit}.zkey`)
        const vkey = path.join(buildPath, `${circuit}.vkey.json`)

        // Check if the input circom file exists
        const inputFileExists = fileExists(circomFile)

        // Exit if it does not
        if (!inputFileExists) {
            console.error('File does not exist:', circomFile)
            return 1
        }

        // Check if the circuitOut file exists and if we should not override files
        const circuitOutFileExists = fileExists(R1CSFile)
        if (!circuitOutFileExists) {
            // Compile the .circom file
            const options = {
                wasmFile: await fastFile.createOverride(wasmFile),
                r1csFileName: R1CSFile,
                symWriteStream: fs.createWriteStream(symFile),
            }
            await compiler(circomFile, options)
        }

        const zkeyOutFileExists = fileExists(zkey)
        if (!zkeyOutFileExists) {
            await snarkjs.zKey.newZKey(R1CSFile, ptau, zkey)
            const vkeyJson = await snarkjs.zKey.exportVerificationKey(zkey)
            const S = JSON.stringify(stringifyBigInts(vkeyJson), null, 1)
            await fs.promises.writeFile(vkey, S)
        }
    }
}

const main = async (): Promise<number> => {
    const dirPath = exportBuildPath
    const configPath = path.join(dirPath, 'config.json')

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

    await generateProvingKey()

    return 0
}

void (async () => {
    try {
        await main()
    } catch (err) {
        console.error(err)
    }
})()
