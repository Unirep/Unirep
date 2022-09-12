import { BigNumberish, ethers, utils } from 'ethers'
import path from 'path'
import fs from 'fs'
import solc from 'solc'
import {
    Circuit,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_ATTESTATIONS_PER_PROOF,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    Prover,
    USER_STATE_TREE_DEPTH,
} from '@unirep/circuits'
import { Unirep, Unirep__factory as UnirepFactory } from '../typechain'
import poseidon from '../src/poseidon'
import { ATTESTING_FEE, EPOCH_LENGTH } from './config'

export { Unirep, UnirepFactory }

function linkLibrary(
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

/**
 * Deploy the unirep contract and verifier contracts with given `deployer` and settings
 * @param deployer A signer who will deploy the contracts
 * @param _settings The settings that the signer can define: `epochLength`, `attestingFee`, `maxUsers`, `maxAttesters`
 * @returns The Unirep smart contract
 */
export const deployUnirep = async (
    deployer: ethers.Signer,
    _settings: {
        epochLength?: BigNumberish
        attestingFee?: BigNumberish
        maxUsers?: BigNumberish
        maxAttesters?: BigNumberish
    } = {},
    prover?: Prover
): Promise<Unirep> => {
    const settings = {
        globalStateTreeDepth:
            prover?.GLOBAL_STATE_TREE_DEPTH ?? GLOBAL_STATE_TREE_DEPTH,
        userStateTreeDepth:
            prover?.USER_STATE_TREE_DEPTH ?? USER_STATE_TREE_DEPTH,
        epochTreeDepth: prover?.EPOCH_TREE_DEPTH ?? EPOCH_TREE_DEPTH,
        numEpochKeyNoncePerEpoch:
            prover?.NUM_EPOCH_KEY_NONCE_PER_EPOCH ??
            NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        maxReputationBudget:
            prover?.MAX_REPUTATION_BUDGET ?? MAX_REPUTATION_BUDGET,
        numAttestationsPerProof:
            prover?.NUM_ATTESTATIONS_PER_PROOF ?? NUM_ATTESTATIONS_PER_PROOF,
        epochLength: EPOCH_LENGTH,
        attestingFee: ATTESTING_FEE,
        maxUsers:
            2 ** (prover?.GLOBAL_STATE_TREE_DEPTH ?? GLOBAL_STATE_TREE_DEPTH) -
            1,
        maxAttesters:
            2 ** (prover?.USER_STATE_TREE_DEPTH ?? USER_STATE_TREE_DEPTH) - 1,
        ..._settings,
    }

    const libraries = {}
    for (const [inputCount, { abi, bytecode }] of Object.entries(
        poseidon
    ) as any) {
        const f = new ethers.ContractFactory(abi, bytecode, deployer)
        const c = await f.deploy()
        await c.deployed()
        libraries[`Poseidon${inputCount}`] = c.address
    }
    let incArtifacts: any
    try {
        incArtifacts = require(path.join(
            __dirname,
            '../build/artifacts/@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol/IncrementalBinaryTree.json'
        ))
    } catch (_) {
        incArtifacts = require(path.join(
            __dirname,
            '../artifacts/@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol/IncrementalBinaryTree.json'
        ))
    }
    let smtArtifacts: any
    try {
        smtArtifacts = require(path.join(
            __dirname,
            '../build/artifacts/contracts/SparseMerkleTree.sol/SparseMerkleTree.json'
        ))
    } catch (_) {
        smtArtifacts = require(path.join(
            __dirname,
            '../artifacts/contracts/SparseMerkleTree.sol/SparseMerkleTree.json'
        ))
    }
    const incrementalMerkleTreeFactory = new ethers.ContractFactory(
        incArtifacts.abi,
        linkLibrary(incArtifacts.bytecode, {
            ['@zk-kit/incremental-merkle-tree.sol/Hashes.sol:PoseidonT3']:
                libraries['Poseidon2'],
        }),
        deployer
    )
    const incrementalMerkleTreeLib = await incrementalMerkleTreeFactory.deploy()
    await incrementalMerkleTreeLib.deployed()
    const sparseMerkleTreeLibFactory = new ethers.ContractFactory(
        smtArtifacts.abi,
        linkLibrary(smtArtifacts.bytecode, {
            [`contracts/Hash.sol:Poseidon2`]: libraries['Poseidon2'],
        }),
        deployer
    )
    const sparseMerkleTreeLib = await sparseMerkleTreeLibFactory.deploy()
    await sparseMerkleTreeLib.deployed()

    const verifiers = {}
    for (const circuit in Circuit) {
        const contractName = createVerifierName(circuit)

        console.log(`Deploying ${contractName}`)
        let artifacts
        if (prover === undefined) {
            artifacts = require(path.join(
                __dirname,
                `../build/artifacts/contracts/verifiers/${contractName}.sol/${contractName}.json`
            ))
        } else {
            const vkey = prover.getVKey(circuit)
            artifacts = await compileVerifier(contractName, vkey)
        }

        const { bytecode, abi } = artifacts
        const verifierFactory = new ethers.ContractFactory(
            abi,
            bytecode,
            deployer
        )
        const verifierContract = await verifierFactory.deploy()
        await verifierContract.deployed()
        verifiers[circuit] = verifierContract.address
    }

    console.log('Deploying Unirep')

    const c: Unirep = await new UnirepFactory(
        {
            ['contracts/Hash.sol:Poseidon5']: libraries['Poseidon5'],
            ['contracts/Hash.sol:Poseidon2']: libraries['Poseidon2'],
            ['contracts/SparseMerkleTree.sol:SparseMerkleTree']:
                sparseMerkleTreeLib.address,
            ['@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol:IncrementalBinaryTree']:
                incrementalMerkleTreeLib.address,
        },
        deployer
    ).deploy(
        settings,
        verifiers[Circuit.verifyEpochKey],
        verifiers[Circuit.startTransition],
        verifiers[Circuit.processAttestations],
        verifiers[Circuit.userStateTransition],
        verifiers[Circuit.proveReputation],
        verifiers[Circuit.proveUserSignUp]
    )

    await c.deployTransaction.wait()

    // Print out deployment info
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(
        'Bytecode size of Unirep:',
        Math.floor(UnirepFactory.bytecode.length / 2),
        'bytes'
    )
    let receipt = await c.provider.getTransactionReceipt(
        c.deployTransaction.hash
    )
    console.log('Gas cost of deploying Unirep:', receipt.gasUsed.toString())
    console.log(
        '-----------------------------------------------------------------'
    )

    return c
}
