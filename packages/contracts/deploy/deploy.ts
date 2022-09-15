import { BigNumberish, ethers } from 'ethers'
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
import poseidon from './poseidon'
import { ATTESTING_FEE, EPOCH_LENGTH } from '../src/config'
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
    const incPath =
        '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol/IncrementalBinaryTree.json'
    const incArtifacts: any = tryPath(incPath)
    const smtPath = 'contracts/SparseMerkleTree.sol/SparseMerkleTree.json'
    const smtArtifacts: any = tryPath(smtPath)
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
            const verifierPath = `contracts/verifiers/${contractName}.sol/${contractName}.json`
            artifacts = tryPath(verifierPath)
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
