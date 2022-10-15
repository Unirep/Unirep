import { BigNumberish, ethers } from 'ethers'
import {
    Circuit,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
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

/**
 * Deploy the unirep contract and verifier contracts with given `deployer` and settings
 * @param deployer A signer who will deploy the contracts
 * @param _settings The settings that the signer can define: `epochLength`, `attestingFee`, `maxUsers`, `maxAttesters`
 * @returns The Unirep smart contract
 */
export const deployUnirep = async (
    deployer: ethers.Signer,
    _settings: {
        globalStateTreeDepth?: BigNumberish
        epochTreeDepth?: BigNumberish
        numEpochKeyNoncePerEpoch?: BigNumberish
        emptyEpochTreeRoot?: BigNumberish
    } = {},
    prover?: Prover
): Promise<Unirep> => {
    const settings = {
        globalStateTreeDepth: GLOBAL_STATE_TREE_DEPTH,
        epochTreeDepth: EPOCH_TREE_DEPTH,
        numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        emptyEpochTreeRoot: EMPTY_EPOCH_TREE_ROOT,
        aggregateKeyCount: AGGREGATE_KEY_COUNT,
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

    const verifiers = {}
    for (const circuit in Circuit) {
        const contractName = createVerifierName(circuit)

        console.log(`Deploying ${contractName}`)
        let artifacts
        if (prover) {
            const vkey = prover.getVKey(circuit)
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
        verifiers[Circuit.proveReputation]
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
