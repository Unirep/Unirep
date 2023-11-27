import { ethers } from 'ethers'
import { Circuit, Prover, CircuitConfig } from '@unirep/circuits'
import { PoseidonT3 } from 'poseidon-solidity'
import GlobalFactory from './globalFactory'
import { Unirep, Unirep__factory as UnirepFactory } from '../typechain'
import {
    compileVerifier,
    createVerifierName,
    linkLibrary,
    tryPath,
} from './utils'

/**
 * The current supported verifier helpers.
 */
const VerifierHelpers = {
    epochKey: Circuit.epochKey,
    epochKeyLite: Circuit.epochKeyLite,
    reputation: Circuit.reputation,
}

/**
 * Create the verififier helper contract name.
 * Capitalize the first character and add `VerifierHelper` at the end.
 * @param circuitName The name of the circuit
 */
const createVerifierHelperName = (circuitName: Circuit): string => {
    const verifierName = Object.keys(VerifierHelpers).find(
        (key) => VerifierHelpers[key] == circuitName
    )

    if (verifierName === undefined) {
        throw new Error('Invalid verifier helper circuit')
    }
    return `${
        verifierName.charAt(0).toUpperCase() + verifierName.slice(1)
    }VerifierHelper`
}

/**
 * Try a function several times.
 * @param fn The function will be executed.
 * @param maxRetry The maximum number of trying functions.
 */
export const retryAsNeeded = async (fn: any, maxRetry = 10) => {
    let retryCount = 0
    let backoff = 1000
    for (;;) {
        try {
            return await fn()
        } catch (err) {
            console.log(err)
            if (++retryCount > maxRetry) throw err
            backoff *= 2
            console.log(`Failed, waiting ${backoff}ms`)
            await new Promise((r) => setTimeout(r, backoff))
        }
    }
}

/**
 * @param deployer A signer or an ethereum wallet
 * @param circuitName Name of the circuit, which can be chosen from `Circuit`
 * @param prover The prover which provides `vkey` of the circuit
 * @returns The deployed verifier smart contract
 */
export const deployVerifier = async (
    deployer: ethers.Signer,
    circuitName: Circuit | string,
    prover?: Prover
): Promise<ethers.Contract> => {
    const contractName = createVerifierName(circuitName)

    console.log(`Deploying ${contractName}`)
    let artifacts: any
    if (prover) {
        const vkey = await prover.getVKey(circuitName)
        artifacts = await compileVerifier(contractName, vkey)
    } else {
        const verifierPath = `contracts/verifiers/${contractName}.sol/${contractName}.json`
        artifacts = tryPath(verifierPath)
    }

    const { bytecode, abi } = artifacts
    const _verifierFactory = new ethers.ContractFactory(abi, bytecode, deployer)
    const verifierFactory = await GlobalFactory(_verifierFactory, deployer)
    const verifierContract = await retryAsNeeded(() => verifierFactory.deploy())
    return verifierContract
}

/**
 * @param deployer A signer or an ethereum wallet
 * @param prover The prover which provides `vkey` of the circuit
 * @returns All deployed verifier smart contracts
 */
export const deployVerifiers = async (
    deployer: ethers.Signer,
    prover?: Prover
): Promise<{ [circuit: string]: string }> => {
    let verifiers = {}
    for (const circuit in Circuit) {
        const verifierContract = await deployVerifier(deployer, circuit, prover)
        verifiers[circuit] = await verifierContract.getAddress()
    }
    return verifiers
}

/**
 * @param deployer A signer or an ethereum wallet
 * @param prover The prover which provides `vkey` of the circuit
 * @returns All deployed verifier helper contracts
 */
export const deployVerifierHelpers = async (
    unirepAddress: string,
    deployer: ethers.Signer,
    prover?: Prover
): Promise<{ [circuit: string]: ethers.Contract }> => {
    let verifierHelpers = {}

    for (const verifierHelper in VerifierHelpers) {
        const verifierContract = await deployVerifierHelper(
            unirepAddress,
            deployer,
            VerifierHelpers[verifierHelper],
            prover
        )
        verifierHelpers[verifierHelper] = verifierContract
    }
    return verifierHelpers
}

/**
 * @param deployer A signer or an ethereum wallet
 * @param circuitName Name of the circuit, which can be chosen from `Circuit`
 * @param prover The prover which provides `vkey` of the circuit
 * @returns The deployed verifier helper contracts
 */
export const deployVerifierHelper = async (
    unirepAddress: string,
    deployer: ethers.Signer,
    circuitName: Circuit,
    prover?: Prover
): Promise<ethers.Contract> => {
    const verifier = await deployVerifier(deployer, circuitName, prover)
    const contractName = createVerifierHelperName(circuitName)
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
    const helperFactory = await GlobalFactory(_helperFactory, deployer)
    const verifierAddress = await verifier.getAddress()
    const helperContract = await retryAsNeeded(() =>
        helperFactory.deploy(unirepAddress, verifierAddress)
    )
    await helperContract.waitForDeployment()
    return helperContract
}

/**
 * Deploy the unirep contract and verifier contracts with given `deployer` and settings
 * @param deployer A signer who will deploy the contracts
 * @param settings The settings that the deployer can define. See [`CircuitConfig`](https://developer.unirep.io/docs/circuits-api/circuit-config)
 * @param prover The prover which provides `vkey` of the circuit
 * @returns The Unirep smart contract
 * @example
 * ```ts
 * import { ethers } from 'ethers'
 * import { Unirep } from '@unirep/contracts'
 * import { deployUnirep } from '@unirep/contracts/deploy'
 * const privateKey = 'YOUR/PRIVATE/KEY'
 * const provider = 'YOUR/ETH/PROVIDER'
 * const deployer = new ethers.Wallet(privateKey, provider);
 * const unirepContract: Unirep = await deployUnirep(deployer)
 * ```
 *
 * :::caution
 * The default circuit configuration is set in [`CircuitConfig.ts`](https://github.com/Unirep/Unirep/blob/1a3c9c944925ec125a7d7d8bfa9990466389477b/packages/circuits/src/CircuitConfig.ts).<br/>
 * Please make sure the `CircuitConfig` matches your [`prover`](circuits-api/interfaces/src.Prover.md).
 * If you don't compile circuits on your own, please don't change the `_settings` and `prover`.<br/>
 * See the current prover and settings of deployed contracts: [🤝 Testnet Deployment](https://developer.unirep.io/docs/testnet-deployment).
 * :::
 */
export const deployUnirep = async (
    deployer: ethers.Signer,
    settings?: CircuitConfig,
    prover?: Prover
): Promise<Unirep> => {
    if (!deployer.provider) {
        throw new Error('Deployer must have provider')
    }
    const config = new CircuitConfig({ ...CircuitConfig.default, ...settings })
    const {
        EPOCH_TREE_DEPTH,
        STATE_TREE_DEPTH,
        HISTORY_TREE_DEPTH,
        NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        FIELD_COUNT,
        SUM_FIELD_COUNT,
        REPL_NONCE_BITS,
        REPL_FIELD_BITS,
    } = new CircuitConfig(settings)

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
    console.log(`Replacement field data bits: ${REPL_FIELD_BITS}`)
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Make sure these match what you expect!`)
    console.log(
        '-----------------------------------------------------------------'
    )

    const poseidonT3Path = 'poseidon-solidity/PoseidonT3.sol/PoseidonT3.json'
    const poseidonT3Artifacts: any = tryPath(poseidonT3Path)
    const _poseidonT3Factory = new ethers.ContractFactory(
        poseidonT3Artifacts.abi,
        poseidonT3Artifacts.bytecode,
        deployer
    )
    const poseidonT3Factory = await GlobalFactory(_poseidonT3Factory, deployer)
    const poseidonT3 = await retryAsNeeded(() => poseidonT3Factory.deploy())
    await poseidonT3.waitForDeployment()

    const incPath =
        '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol/IncrementalBinaryTree.json'
    const incArtifacts: any = tryPath(incPath)
    const _incrementalMerkleTreeFactory = new ethers.ContractFactory(
        incArtifacts.abi,
        linkLibrary(incArtifacts.bytecode, {
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']:
                await poseidonT3.getAddress(),
        }),
        deployer
    )
    const incrementalMerkleTreeFactory = await GlobalFactory(
        _incrementalMerkleTreeFactory,
        deployer
    )
    const incrementalMerkleTreeLib = await retryAsNeeded(() =>
        incrementalMerkleTreeFactory.deploy()
    )
    await incrementalMerkleTreeLib.waitForDeployment()

    const reusableMerklePath =
        'contracts/libraries/ReusableMerkleTree.sol/ReusableMerkleTree.json'
    const reusableMerkleArtifacts = tryPath(reusableMerklePath)
    const _reusableMerkleFactory = new ethers.ContractFactory(
        reusableMerkleArtifacts.abi,
        linkLibrary(reusableMerkleArtifacts.bytecode, {
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']:
                await poseidonT3.getAddress(),
        }),
        deployer
    )
    const reusableMerkleFactory = await GlobalFactory(
        _reusableMerkleFactory,
        deployer
    )
    const reusableMerkleContract = await retryAsNeeded(() =>
        reusableMerkleFactory.deploy()
    )
    await reusableMerkleContract.waitForDeployment()

    const lazyMerklePath =
        'contracts/libraries/LazyMerkleTree.sol/LazyMerkleTree.json'
    const lazyMerkleArtifacts = tryPath(lazyMerklePath)
    const _lazyMerkleFactory = new ethers.ContractFactory(
        lazyMerkleArtifacts.abi,
        linkLibrary(lazyMerkleArtifacts.bytecode, {
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']:
                await poseidonT3.getAddress(),
        }),
        deployer
    )
    const lazyMerkleFactory = await GlobalFactory(_lazyMerkleFactory, deployer)
    const lazyMerkleContract = await retryAsNeeded(() =>
        lazyMerkleFactory.deploy()
    )
    await lazyMerkleContract.waitForDeployment()

    const verifiers = await deployVerifiers(deployer, prover)

    console.log('Deploying Unirep')
    const unirepPath = 'contracts/Unirep.sol/Unirep.json'
    const unirepArtifacts = tryPath(unirepPath)
    const _unirepFactory = new ethers.ContractFactory(
        unirepArtifacts.abi,
        linkLibrary(unirepArtifacts.bytecode, {
            ['@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol:IncrementalBinaryTree']:
                await incrementalMerkleTreeLib.getAddress(),
            ['contracts/libraries/ReusableMerkleTree.sol:ReusableMerkleTree']:
                await reusableMerkleContract.getAddress(),
            ['contracts/libraries/LazyMerkleTree.sol:LazyMerkleTree']:
                await lazyMerkleContract.getAddress(),
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']:
                await poseidonT3.getAddress(),
        }),
        deployer
    )
    const unirepFactory = await GlobalFactory(_unirepFactory, deployer)
    const c: Unirep = await retryAsNeeded(() =>
        unirepFactory.deploy(
            config.contractConfig,
            verifiers[Circuit.signup],
            verifiers[Circuit.userStateTransition]
        )
    )

    const deployment = await retryAsNeeded(() =>
        c.deploymentTransaction()?.wait()
    )

    // Print out deployment info
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(
        'Bytecode size of Unirep:',
        Math.floor(UnirepFactory.bytecode.length / 2),
        'bytes'
    )
    if (deployment) {
        const receipt = await deployer.provider?.getTransactionReceipt(
            deployment.hash
        )
        console.log(
            'Gas cost of deploying Unirep:',
            receipt?.gasUsed.toString()
        )
    } else {
        console.log('Re-using existing Unirep deployment')
    }
    console.log(`Deployed to: ${await c.getAddress()}`)
    console.log(
        '-----------------------------------------------------------------'
    )

    return c
}
