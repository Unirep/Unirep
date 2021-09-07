import * as argparse from 'argparse' 
import * as fs from 'fs'
import * as path from 'path'
import * as shell from 'shelljs'

import { genSnarkVerifierSol } from './genVerifier'

const fileExists = (filepath: string): boolean => {
    const currentPath = path.join(__dirname, '..')
    const inputFilePath = path.join(currentPath, filepath)
    const inputFileExists = fs.existsSync(inputFilePath)

    return inputFileExists
}

const snarkjsCliPath = path.join(__dirname, '../node_modules/snarkjs/cli.js')

const main = () => {
    const parser = new argparse.ArgumentParser({ 
        description: 'Compile a circom circuit and generate its proving key, verification key, and Solidity verifier'
    })

    parser.add_argument(
        '-i', '--input',
        {
            help: 'The filepath of the circom file',
            required: true
        }
    )

    parser.add_argument(
        '-j', '--r1cs-out',
        {
            help: 'The filepath to save the compiled circom file',
            required: true
        }
    )

    parser.add_argument(
        '-w', '--wasm-out',
        {
            help: 'The filepath to save the WASM file',
            required: true
        }
    )

    parser.add_argument(
        '-y', '--sym-out',
        {
            help: 'The filepath to save the SYM file',
            required: true
        }
    )

    parser.add_argument(
        '-s', '--sol-out',
        {
            help: 'The filepath to save the Solidity verifier contract',
            required: true
        }
    )

    parser.add_argument(
        '-pt', '--ptau',
        {
            help: 'The filepath of existed ptau',
            required: true
        }
    )

    parser.add_argument(
        '-zk', '--zkey-out',
        {
            help: 'The filepath to save the zkey',
            required: true
        }
    )

    parser.add_argument(
        '-r', '--override',
        {
            help: 'Override an existing compiled circuit, proving key, and verifying key if set to true; otherwise (and by default), skip generation if a file already exists',
            action: 'store_true',
            required: false,
            default: false,
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
    const inputFile = args.input
    const override = args.override
    const circuitOut = args.r1cs_out
    const symOut = args.sym_out
    const wasmOut = args.wasm_out
    const verifierName = args.verifier_name
    const ptau = args.ptau
    const zkey = args.zkey_out
    const zkeyJson = zkey + '.json'

    // Check if the input circom file exists
    const inputFileExists = fileExists(inputFile)

    // Exit if it does not
    if (!inputFileExists) {
        console.error('File does not exist:', inputFile)
        return 1
    }

    // Set memory options for node
    shell.env['NODE_OPTIONS'] = ['--max-old-space-size=4096']

    // Check if the circuitOut file exists and if we should not override files
    const circuitOutFileExists = fileExists(circuitOut)

    if (!override && circuitOutFileExists) {
        console.log(circuitOut, 'exists. Skipping compilation.')
    } else {
        console.log(`Compiling ${inputFile}...`)
        // Compile the .circom file
        shell.exec(`node ./node_modules/circom/cli.js ${inputFile} -r ${circuitOut} -w ${wasmOut} -s ${symOut}`)
        console.log('Generated', circuitOut, 'and', wasmOut)
    }

    const zkeyOutFileExists = fileExists(zkey)
    if (!override && zkeyOutFileExists) {
        console.log(zkey, 'exists. Skipping compilation.')
    } else {
        console.log('Exporting verification key...')
        shell.exec(`node ${snarkjsCliPath} zkn ${circuitOut} ${ptau} ${zkey}`)
        shell.exec(`node ${snarkjsCliPath} zkev ${zkey} ${zkeyJson}`)
        console.log(`Generated ${zkey} and ${zkeyJson}`)
    }

    console.log('Exporting verification contract...')
    const verifier = genSnarkVerifierSol(
        verifierName,
        JSON.parse(fs.readFileSync(zkeyJson).toString()),
    )

    fs.writeFileSync(solOut, verifier)
    return 0
}

if (require.main === module) {
    let exitCode;
    try {
        exitCode = main()
    } catch (err) {
        console.error(err)
        exitCode = 1
    }
    process.exit(exitCode)
}