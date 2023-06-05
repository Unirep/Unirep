import { ethers } from 'ethers'
import { Circuit, Prover, CircuitConfig } from '@unirep/circuits'
import { PoseidonT3 } from 'poseidon-solidity'
import GlobalFactory from 'global-factory'
import { Unirep, Unirep__factory as UnirepFactory } from '../typechain'
import {
    compileVerifier,
    createVerifierName,
    linkLibrary,
    tryPath,
} from './utils'

const VerifierHelpers = {
    epochKey: Circuit.epochKey,
    epochKeyLite: Circuit.epochKeyLite,
    reputation: Circuit.proveReputation,
}

const createVerifierHelperName = (circuit: Circuit): string => {
    const verifierName = Object.keys(VerifierHelpers).find(
        (key) => VerifierHelpers[key] == circuit
    )

    if (verifierName === undefined) {
        throw new Error('Invalid verifier helper circuit')
    }
    return `${
        verifierName.charAt(0).toUpperCase() + verifierName.slice(1)
    }VerifierHelper`
}

export const retryAsNeeded = async (fn: any, maxRetry = 10) => {
    let retryCount = 0
    let backoff = 1000
    for (;;) {
        try {
            return await fn()
        } catch (err) {
            if (++retryCount > maxRetry) throw err
            backoff *= 2
            console.log(`Failed, waiting ${backoff}ms`)
            await new Promise((r) => setTimeout(r, backoff))
        }
    }
}

export const deployVerifier = async (
    deployer: ethers.Signer,
    circuit: Circuit | string,
    prover?: Prover
): Promise<ethers.Contract> => {
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
    const _verifierFactory = new ethers.ContractFactory(abi, bytecode, deployer)
    const verifierFactory = await GlobalFactory(_verifierFactory)
    const verifierContract = await retryAsNeeded(() => verifierFactory.deploy())
    return verifierContract
}

export const deployVerifiers = async (
    deployer: ethers.Signer,
    prover?: Prover
): Promise<{ [circuit: string]: Promise<Prover> }> => {
    let verifiers = {}
    for (const circuit in Circuit) {
        const verifierContract = await deployVerifier(deployer, circuit, prover)
        verifiers[circuit] = verifierContract.address
    }
    return verifiers
}

export const deployVerifierHelpers = async (
    deployer: ethers.Signer,
    prover?: Prover
) => {
    let verifierHelpers = {}

    for (const verifierHelper in VerifierHelpers) {
        const verifierContract = await deployVerifierHelper(
            deployer,
            VerifierHelpers[verifierHelper],
            prover
        )
        verifierHelpers[verifierHelper] = verifierContract
    }
    return verifierHelpers
}

export const deployVerifierHelper = async (
    deployer: ethers.Signer,
    circuit: Circuit,
    prover?: Prover
): Promise<ethers.Contract> => {
    const verifier = await deployVerifier(deployer, circuit, prover)
    const contractName = createVerifierHelperName(circuit)
    console.log(`Deploying ${contractName}`)
    let artifacts
    if (prover) {
        const vkey = await prover.getVKey(contractName)
        artifacts = await compileVerifier(contractName, vkey)
    } else {
        const verifierPath = `contracts/verifierHelpers/${contractName}.sol/${contractName}.json`
        artifacts = tryPath(verifierPath)
    }

    const { bytecode, abi } = artifacts
    const _helperFactory = new ethers.ContractFactory(abi, bytecode, deployer)
    const helperFactory = await GlobalFactory(_helperFactory)
    const helperContract = await retryAsNeeded(() =>
        helperFactory.deploy(verifier.address)
    )
    await helperContract.deployed()
    return helperContract
}

/**
 * Deploy the unirep contract and verifier contracts with given `deployer` and settings
 * @param deployer A signer who will deploy the contracts
 * @param _settings The settings that the signer can define: `epochLength`, `attestingFee`, `maxUsers`, `maxAttesters`
 * @returns The Unirep smart contract
 */
export const deployUnirep = async (
    deployer: ethers.Signer,
    _settings: CircuitConfig = CircuitConfig.default,
    prover?: Prover
): Promise<Unirep> => {
    if (!deployer.provider) {
        throw new Error('Deployer must have provider')
    }
    const config = new CircuitConfig({ ...CircuitConfig.default, ..._settings })
    const {
        EPOCH_TREE_DEPTH,
        STATE_TREE_DEPTH,
        HISTORY_TREE_DEPTH,
        NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        FIELD_COUNT,
        SUM_FIELD_COUNT,
        REPL_NONCE_BITS,
    } = config

    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Epoch tree depth: ${EPOCH_TREE_DEPTH}`)
    console.log(`State tree depth: ${STATE_TREE_DEPTH}`)
    console.log(`History tree depth: ${HISTORY_TREE_DEPTH}`)
    console.log(
        `Number of epoch keys per epoch: ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}`
    )
    console.log(`Total fields per user: ${FIELD_COUNT}`)
    console.log(`Sum fields per user: ${SUM_FIELD_COUNT}`)
    console.log(`Replacement field nonce bits: ${REPL_NONCE_BITS}`)
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Make sure these match what you expect!`)
    console.log(
        '-----------------------------------------------------------------'
    )

    if ((await deployer.provider.getCode(PoseidonT3.proxyAddress)) === '0x') {
        await retryAsNeeded(() =>
            deployer.sendTransaction({
                to: PoseidonT3.from,
                value: PoseidonT3.gas,
            })
        )
        await retryAsNeeded(() =>
            deployer.provider?.sendTransaction(PoseidonT3.tx)
        )
    }
    if ((await deployer.provider.getCode(PoseidonT3.address)) === '0x') {
        // nothing to do, contract is already deployed
        await retryAsNeeded(() =>
            deployer.sendTransaction({
                to: PoseidonT3.proxyAddress,
                data: PoseidonT3.data,
            })
        )
    }

    const incPath =
        '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol/IncrementalBinaryTree.json'
    const incArtifacts: any = tryPath(incPath)
    const _incrementalMerkleTreeFactory = new ethers.ContractFactory(
        incArtifacts.abi,
        linkLibrary(incArtifacts.bytecode, {
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']: PoseidonT3.address,
        }),
        deployer
    )
    const incrementalMerkleTreeFactory = await GlobalFactory(
        _incrementalMerkleTreeFactory
    )
    const incrementalMerkleTreeLib = await retryAsNeeded(() =>
        incrementalMerkleTreeFactory.deploy()
    )
    await incrementalMerkleTreeLib.deployed()

    const reusableMerklePath =
        'contracts/libraries/ReusableMerkleTree.sol/ReusableMerkleTree.json'
    const reusableMerkleArtifacts = tryPath(reusableMerklePath)
    const _reusableMerkleFactory = new ethers.ContractFactory(
        reusableMerkleArtifacts.abi,
        linkLibrary(reusableMerkleArtifacts.bytecode, {
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']: PoseidonT3.address,
        }),
        deployer
    )
    const reusableMerkleFactory = await GlobalFactory(_reusableMerkleFactory)
    const reusableMerkleContract = await retryAsNeeded(() =>
        reusableMerkleFactory.deploy()
    )
    await reusableMerkleContract.deployed()

    const lazyMerklePath =
        'contracts/libraries/LazyMerkleTree.sol/LazyMerkleTree.json'
    const lazyMerkleArtifacts = tryPath(lazyMerklePath)
    const _lazyMerkleFactory = new ethers.ContractFactory(
        lazyMerkleArtifacts.abi,
        linkLibrary(lazyMerkleArtifacts.bytecode, {
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']: PoseidonT3.address,
        }),
        deployer
    )
    const lazyMerkleFactory = await GlobalFactory(_lazyMerkleFactory)
    const lazyMerkleContract = await retryAsNeeded(() =>
        lazyMerkleFactory.deploy()
    )
    await lazyMerkleContract.deployed()

    const verifiers = await deployVerifiers(deployer, prover)

    console.log('Deploying Unirep')
    const c: Unirep = await retryAsNeeded(async () =>
        (
            await GlobalFactory(
                new UnirepFactory(
                    {
                        ['@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol:IncrementalBinaryTree']:
                            incrementalMerkleTreeLib.address,
                        ['contracts/libraries/ReusableMerkleTree.sol:ReusableMerkleTree']:
                            reusableMerkleContract.address,
                        ['contracts/libraries/LazyMerkleTree.sol:LazyMerkleTree']:
                            lazyMerkleContract.address,
                        ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']:
                            PoseidonT3.address,
                    },
                    deployer
                )
            )
        ).deploy(
            config.contractConfig,
            verifiers[Circuit.signup],
            verifiers[Circuit.userStateTransition]
        )
    )

    await retryAsNeeded(() => c.deployTransaction?.wait())

    // Print out deployment info
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(
        'Bytecode size of Unirep:',
        Math.floor(UnirepFactory.bytecode.length / 2),
        'bytes'
    )
    if (c.deployTransaction) {
        const receipt = await deployer.provider?.getTransactionReceipt(
            c.deployTransaction.hash
        )
        console.log(
            'Gas cost of deploying Unirep:',
            receipt?.gasUsed.toString()
        )
    } else {
        console.log('Re-using existing Unirep deployment')
    }
    console.log(`Deployed to: ${c.address}`)
    console.log(
        '-----------------------------------------------------------------'
    )

    return c
}
