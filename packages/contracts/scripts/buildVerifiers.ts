import * as fs from 'fs'
import path from 'path'
import UnirepCircuit, { CircuitName } from '@unirep/circuits'

export const zkFilesPath = path.join(__dirname, '../../circuits/zksnarkBuild')
export const verifiersPath = path.join(__dirname, '../contracts/verifiers')
import { genSnarkVerifierSol } from './genVerifier'

const createVerifierName = (circuit: string) => {
    return `${circuit.charAt(0).toUpperCase() + circuit.slice(1)}Verifier`
}

const main = async (): Promise<number> => {
    // create verifier folder
    try {
        fs.mkdirSync(verifiersPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }

    for (const circuit of Object.keys(CircuitName)) {
        const verifierName = createVerifierName(circuit)
        const solOut = path.join(verifiersPath, `${verifierName}.sol`)
        const circuitName = circuit as CircuitName
        const vKey = await UnirepCircuit.getVKey(zkFilesPath, circuitName)

        console.log('Exporting verification contract...')
        const verifier = genSnarkVerifierSol(verifierName, vKey)

        fs.writeFileSync(solOut, verifier)
        fs.copyFileSync(solOut, path.join(verifiersPath, `${verifierName}.sol`))
    }
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
