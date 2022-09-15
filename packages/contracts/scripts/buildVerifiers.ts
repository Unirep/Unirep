import * as fs from 'fs'
import path from 'path'
import { Circuit } from '@unirep/circuits'

import { config } from 'hardhat'
import hardhatConfig from '../hardhat.config'
import { genVerifier, createVerifierName } from '../deploy/utils'

const verifiersPath = hardhatConfig?.paths?.sources
    ? path.join(hardhatConfig.paths.sources, 'verifiers')
    : path.join(config.paths.sources, 'verifiers')

const zkFilesPath = path.join('../../circuits/zksnarkBuild')

const main = async (): Promise<number> => {
    // create verifier folder
    try {
        fs.mkdirSync(verifiersPath, { recursive: true })
    } catch (e) {
        console.log('Cannot create folder ', e)
    }

    for (const circuit of Object.keys(Circuit)) {
        const verifierName = createVerifierName(circuit)
        const solOut = path.join(verifiersPath, `${verifierName}.sol`)
        const vKey = require(path.join(zkFilesPath, `${circuit}.vkey.json`))

        console.log(`Exporting ${circuit} verification contract...`)
        const verifier = genVerifier(verifierName, vKey)

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
