import { utils } from 'ethers'
import path from 'path'
import fs from 'fs'
import solc from 'solc'
import { Circuit } from '@unirep/circuits'

export function linkLibrary(
    bytecode: string,
    libraries: {
        [name: string]: string
    } = {}
): string {
    let linkedBytecode = bytecode
    for (const [name, address] of Object.entries(libraries)) {
        const placeholder = `__\$${utils
            .solidityKeccak256(['string'], [name])
            .slice(2, 36)}\$__`
        const formattedAddress = utils
            .getAddress(address)
            .toLowerCase()
            .replace('0x', '')
        if (linkedBytecode.indexOf(placeholder) === -1) {
            throw new Error(`Unable to find placeholder for library ${name}`)
        }
        while (linkedBytecode.indexOf(placeholder) !== -1) {
            linkedBytecode = linkedBytecode.replace(
                placeholder,
                formattedAddress
            )
        }
    }
    return linkedBytecode
}

export const createVerifierName = (circuit: Circuit | string) => {
    return `${circuit.charAt(0).toUpperCase() + circuit.slice(1)}Verifier`
}

export const genVerifier = (contractName: string, vk: any): string => {
    const templatePath = path.resolve(
        __dirname,
        './template/groth16Verifier.txt'
    )

    let template = fs.readFileSync(templatePath, 'utf8')

    template = template.replace('<%contract_name%>', contractName)

    const vkalpha1 =
        `uint256(${vk.vk_alpha_1[0].toString()}),` +
        `uint256(${vk.vk_alpha_1[1].toString()})`
    template = template.replace('<%vk_alpha1%>', vkalpha1)

    const vkbeta2 =
        `[uint256(${vk.vk_beta_2[0][1].toString()}),` +
        `uint256(${vk.vk_beta_2[0][0].toString()})], ` +
        `[uint256(${vk.vk_beta_2[1][1].toString()}),` +
        `uint256(${vk.vk_beta_2[1][0].toString()})]`
    template = template.replace('<%vk_beta2%>', vkbeta2)

    const vkgamma2 =
        `[uint256(${vk.vk_gamma_2[0][1].toString()}),` +
        `uint256(${vk.vk_gamma_2[0][0].toString()})], ` +
        `[uint256(${vk.vk_gamma_2[1][1].toString()}),` +
        `uint256(${vk.vk_gamma_2[1][0].toString()})]`
    template = template.replace('<%vk_gamma2%>', vkgamma2)

    const vkdelta2 =
        `[uint256(${vk.vk_delta_2[0][1].toString()}),` +
        `uint256(${vk.vk_delta_2[0][0].toString()})], ` +
        `[uint256(${vk.vk_delta_2[1][1].toString()}),` +
        `uint256(${vk.vk_delta_2[1][0].toString()})]`
    template = template.replace('<%vk_delta2%>', vkdelta2)

    template = template.replace(
        '<%vk_input_length%>',
        (vk.IC.length - 1).toString()
    )
    template = template.replace('<%vk_ic_length%>', vk.IC.length.toString())
    let vi = ''
    for (let i = 0; i < vk.IC.length; i++) {
        if (vi.length !== 0) {
            vi = vi + '        '
        }
        vi =
            vi +
            `vk.IC[${i}] = Pairing.G1Point(uint256(${vk.IC[
                i
            ][0].toString()}),` +
            `uint256(${vk.IC[i][1].toString()}));\n`
    }
    template = template.replace('<%vk_ic_pts%>', vi)

    return template
}

export const compileVerifier = async (contractName: string, vkey: any) => {
    const fileName = contractName + '.sol'
    const sources = {}
    sources[fileName] = {}
    sources[fileName]['content'] = genVerifier(contractName, vkey)
    const input = {
        language: 'Solidity',
        sources: sources,
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*'],
                },
            },
        },
    }

    const output = JSON.parse(solc.compile(JSON.stringify(input)))
    return {
        abi: output.contracts[fileName][contractName].abi,
        bytecode: output.contracts[fileName][contractName].evm.bytecode.object,
    }
}

export function tryPath(file: string) {
    let artifacts: any
    try {
        artifacts = require(path.join(__dirname, '../build/artifacts', file))
    } catch (_) {
        artifacts = require(path.join(__dirname, '../artifacts', file))
    }
    return artifacts
}
