import { ethers } from 'ethers'
import { Circuit, Prover, CircuitConfig } from '@unirep/circuits'
import { Unirep, Unirep__factory as UnirepFactory } from '../typechain'
import {
    compileVerifier,
    createVerifierName,
    linkLibrary,
    tryPath,
} from './utils'

const DEPLOY_DELAY = +(process.env.DEPLOY_DELAY ?? 1500)

const retryAsNeeded = async (fn: any, maxRetry = 10) => {
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
    const {
        EPOCH_TREE_DEPTH,
        EPOCH_TREE_ARITY,
        STATE_TREE_DEPTH,
        NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        FIELD_COUNT,
        SUM_FIELD_COUNT,
        HISTORY_TREE_DEPTH,
    } = { ...CircuitConfig.default, ..._settings }

    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Epoch tree depth: ${EPOCH_TREE_DEPTH}`)
    console.log(`Epoch tree arity: ${EPOCH_TREE_ARITY}`)
    console.log(`State tree depth: ${STATE_TREE_DEPTH}`)
    console.log(`History tree depth: ${HISTORY_TREE_DEPTH}`)
    console.log(
        `Number of epoch keys per epoch: ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}`
    )
    console.log(`Total fields per user: ${FIELD_COUNT}`)
    console.log(`Sum fields per user: ${SUM_FIELD_COUNT}`)
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Make sure these match what you expect!`)
    console.log(
        '-----------------------------------------------------------------'
    )

    let PoseidonT2
    {
        const poseidonPath = 'poseidon-solidity/PoseidonT2.sol/PoseidonT2.json'
        const poseidonArtifacts = tryPath(poseidonPath)
        const poseidonFactory = new ethers.ContractFactory(
            poseidonArtifacts.abi,
            poseidonArtifacts.bytecode,
            deployer
        )
        PoseidonT2 = await retryAsNeeded(() => poseidonFactory.deploy())
        await PoseidonT2.deployed()
    }

    let PoseidonT3
    {
        const poseidonPath = 'poseidon-solidity/PoseidonT3.sol/PoseidonT3.json'
        const poseidonArtifacts = tryPath(poseidonPath)
        const poseidonFactory = new ethers.ContractFactory(
            poseidonArtifacts.abi,
            poseidonArtifacts.bytecode,
            deployer
        )
        PoseidonT3 = await retryAsNeeded(() => poseidonFactory.deploy())
        await PoseidonT3.deployed()
    }

    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))
    const incPath =
        '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol/IncrementalBinaryTree.json'
    const incArtifacts: any = tryPath(incPath)
    const incrementalMerkleTreeFactory = new ethers.ContractFactory(
        incArtifacts.abi,
        linkLibrary(incArtifacts.bytecode, {
            ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']: PoseidonT3.address,
        }),
        deployer
    )
    const incrementalMerkleTreeLib = await retryAsNeeded(() =>
        incrementalMerkleTreeFactory.deploy()
    )
    await incrementalMerkleTreeLib.deployed()

    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))

    const polyPath = 'contracts/libraries/Polysum.sol/Polysum.json'
    const polyArtifacts = tryPath(polyPath)
    const polyFactory = new ethers.ContractFactory(
        polyArtifacts.abi,
        polyArtifacts.bytecode,
        deployer
    )
    const polyContract = await retryAsNeeded(() => polyFactory.deploy())
    await polyContract.deployed()

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
        const verifierContract = await retryAsNeeded(() =>
            verifierFactory.deploy()
        )
        await verifierContract.deployed()
        verifiers[circuit] = verifierContract.address
    }
    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))

    console.log('Deploying Unirep')

    const c: Unirep = await retryAsNeeded(() =>
        new UnirepFactory(
            {
                ['@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol:IncrementalBinaryTree']:
                    incrementalMerkleTreeLib.address,
                ['contracts/libraries/Polysum.sol:Polysum']:
                    polyContract.address,
                ['poseidon-solidity/PoseidonT2.sol:PoseidonT2']:
                    PoseidonT2.address,
                ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']: PoseidonT3.address,
            },
            deployer
        ).deploy(
            {
                stateTreeDepth: STATE_TREE_DEPTH,
                historyTreeDepth: HISTORY_TREE_DEPTH,
                epochTreeDepth: EPOCH_TREE_DEPTH,
                epochTreeArity: EPOCH_TREE_ARITY,
                numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
                fieldCount: FIELD_COUNT,
                sumFieldCount: SUM_FIELD_COUNT,
            },
            verifiers[Circuit.signup],
            verifiers[Circuit.userStateTransition],
            verifiers[Circuit.proveReputation],
            verifiers[Circuit.epochKey],
            verifiers[Circuit.epochKeyLite],
            verifiers[Circuit.buildOrderedTree]
        )
    )

    await retryAsNeeded(() => c.deployTransaction.wait())

    // Print out deployment info
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(
        'Bytecode size of Unirep:',
        Math.floor(UnirepFactory.bytecode.length / 2),
        'bytes'
    )
    const receipt = await c.provider.getTransactionReceipt(
        c.deployTransaction.hash
    )
    console.log('Gas cost of deploying Unirep:', receipt.gasUsed.toString())
    console.log(`Deployed to: ${c.address}`)
    console.log(
        '-----------------------------------------------------------------'
    )

    return c
}
