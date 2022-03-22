import * as argparse from 'argparse' 
import * as fs from 'fs'
import { getVKey } from "@unirep/circuits"
import { genSnarkVerifierSol } from './genVerifier'

const main = async () => {
    const parser = new argparse.ArgumentParser({ 
        description: 'Compile a circom circuit and generate its proving key, verification key, and Solidity verifier'
    })

    parser.add_argument(
        '-s', '--sol-out',
        {
            help: 'The filepath to save the Solidity verifier contract',
            required: true
        }
    )

    parser.add_argument(
        '-cn', '--circuit-name',
        {
            help: 'The name of the vkey',
            required: true
        }
    )

    parser.add_argument(
        '-vs', '--verifier-name',
        {
            help: 'The desired name of the verifier contract',
            required: true
        }
    )

    const args = parser.parse_args()
    const solOut = args.sol_out
    const verifierName = args.verifier_name
    const circuitName = args.circuit_name
    const vKey = await getVKey(circuitName)

    console.log('Exporting verification contract...')
    const verifier = genSnarkVerifierSol(
        verifierName,
        vKey,
    )

    fs.writeFileSync(solOut, verifier)
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