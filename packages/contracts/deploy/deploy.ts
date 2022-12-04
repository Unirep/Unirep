import { BigNumberish, ethers } from 'ethers'
import {
    Circuit,
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    EMPTY_EPOCH_TREE_ROOT,
    AGGREGATE_KEY_COUNT,
    Prover,
} from '@unirep/circuits'
import { Unirep, Unirep__factory as UnirepFactory } from '../typechain'
import poseidon from './poseidon'
import {
    compileVerifier,
    createVerifierName,
    linkLibrary,
    tryPath,
} from './utils'
import { SparseMerkleTree, hash4 } from '@unirep/utils'

const DEPLOY_DELAY = +(process.env.DEPLOY_DELAY ?? 1500)

/**
 * Deploy the unirep contract and verifier contracts with given `deployer` and settings
 * @param deployer A signer who will deploy the contracts
 * @param _settings The settings that the signer can define: `epochLength`, `attestingFee`, `maxUsers`, `maxAttesters`
 * @returns The Unirep smart contract
 */
export const deployUnirep = async (
    deployer: ethers.Signer,
    _settings: {
        stateTreeDepth?: BigNumberish
        epochTreeDepth?: BigNumberish
        epochTreeArity?: BigNumberish
        numEpochKeyNoncePerEpoch?: BigNumberish
        defaultEpochTreeLeaf?: bigint
    } = {},
    prover?: Prover
): Promise<Unirep> => {
    const settings = {
        stateTreeDepth: STATE_TREE_DEPTH,
        epochTreeDepth: EPOCH_TREE_DEPTH,
        epochTreeArity: EPOCH_TREE_ARITY,
        numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        defaultEpochTreeLeaf: hash4([0, 0, 0, 0]),
        aggregateKeyCount: AGGREGATE_KEY_COUNT,
        ..._settings,
    } as any
    const emptyEpochTree = new SparseMerkleTree(
        Number(settings.epochTreeDepth.toString()),
        settings.defaultEpochTreeLeaf,
        settings.epochTreeArity
    )
    settings.emptyEpochTreeRoot = emptyEpochTree.root.toString()

    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Epoch tree depth: ${settings.epochTreeDepth}`)
    console.log(`Epoch tree arity: ${settings.epochTreeArity}`)
    console.log(`State tree depth: ${settings.stateTreeDepth}`)
    console.log(`Empty epoch tree root: ${settings.emptyEpochTreeRoot}`)
    console.log(
        `Number of epoch keys per aggregate proof: ${settings.aggregateKeyCount}`
    )
    console.log(
        `Number of epoch keys per epoch: ${settings.numEpochKeyNoncePerEpoch}`
    )
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Make sure these match what you expect!`)
    console.log(
        '-----------------------------------------------------------------'
    )

    const libraries = {}
    for (const [inputCount, { abi, bytecode }] of Object.entries(
        poseidon
    ) as any) {
        await new Promise((r) => setTimeout(r, DEPLOY_DELAY))
        const f = new ethers.ContractFactory(abi, bytecode, deployer)
        const c = await f.deploy()
        await c.deployed()
        libraries[`Poseidon${inputCount}`] = c.address
    }
    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))
    const incPath =
        '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol/IncrementalBinaryTree.json'
    const incArtifacts: any = tryPath(incPath)
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
    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))

    const verifiers = {}
    for (const circuit in Circuit) {
        await new Promise((r) => setTimeout(r, DEPLOY_DELAY))
        const contractName = createVerifierName(circuit)

        console.log(`Deploying ${contractName}`)
        let artifacts
        if (prover) {
            const vkey = await prover.getVKey(circuit)
            artifacts = await compileVerifier(contractName, vkey)
        } else {
            const verifierPath = `contracts/verifiers/${contractName}.sol/${contractName}.json`
            artifacts = tryPath(verifierPath)
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
    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))

    console.log('Deploying Unirep')

    const c: Unirep = await new UnirepFactory(
        {
            ['@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol:IncrementalBinaryTree']:
                incrementalMerkleTreeLib.address,
            ['contracts/Hash.sol:Poseidon3']: libraries['Poseidon3'],
            ['contracts/Hash.sol:Poseidon4']: libraries['Poseidon4'],
            ['contracts/Hash.sol:Poseidon6']: libraries['Poseidon6'],
        },
        deployer
    ).deploy(
        settings,
        verifiers[Circuit.signup],
        verifiers[Circuit.aggregateEpochKeys],
        verifiers[Circuit.userStateTransition],
        verifiers[Circuit.proveReputation],
        verifiers[Circuit.verifyEpochKey],
        verifiers[Circuit.epochKeyLite],
        verifiers[Circuit.epochKeyMulti]
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
