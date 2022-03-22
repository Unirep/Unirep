import * as argparse from 'argparse' 
import * as fs from 'fs'
import * as path from 'path'
import { stringifyBigInts } from '@unirep/crypto';
const compiler = require('circom').compiler
const snarkjs = require('snarkjs')
const fastFile = require("fastfile")

const fileExists = (filepath: string): boolean => {
    const currentPath = path.join(__dirname, '..')
    const inputFilePath = path.join(currentPath, filepath)
    const inputFileExists = fs.existsSync(inputFilePath)

    return inputFileExists
}

const main = async () => {
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
        '-vk', '--vkey-out',
        {
            help: 'The filepath to save the vkey',
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

    const args = parser.parse_args()
    const inputFile = args.input
    const override = args.override
    const circuitOut = args.r1cs_out
    const symOut = args.sym_out
    const wasmOut = args.wasm_out
    const ptau = args.ptau
    const zkey = args.zkey_out
    const vkOut = args.vkey_out

    // Check if the input circom file exists
    const inputFileExists = fileExists(inputFile)

    // Exit if it does not
    if (!inputFileExists) {
        console.error('File does not exist:', inputFile)
        return 1
    }

    // Check if the circuitOut file exists and if we should not override files
    const circuitOutFileExists = fileExists(circuitOut)

    if (!override && circuitOutFileExists) {
        console.log(circuitOut, 'exists. Skipping compilation.')
    } else {
        console.log(`Compiling ${inputFile}...`)
        // Compile the .circom file
        const options = {
            wasmFile: await fastFile.createOverride(wasmOut),
            r1csFileName: circuitOut,
            symWriteStream: fs.createWriteStream(symOut),
        };
        await compiler(inputFile, options)
        console.log('Generated', circuitOut, 'and', wasmOut)
    }

    const zkeyOutFileExists = fileExists(zkey)
    if (!override && zkeyOutFileExists) {
        console.log(zkey, 'exists. Skipping compilation.')
    } else {
        console.log('Exporting verification key...')
        await snarkjs.zKey.newZKey(circuitOut, ptau, zkey)
        const vkeyJson = await snarkjs.zKey.exportVerificationKey(zkey)
        const S = JSON.stringify(stringifyBigInts(vkeyJson), null, 1);
        await fs.promises.writeFile(vkOut, S);
        console.log(`Generated ${zkey} and ${vkOut}`)
    }

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