import { ethers } from 'ethers'
import { Circuit, Prover, CircuitConfig } from '@unirep/circuits'
import GlobalFactory from 'global-factory'
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
        STATE_TREE_DEPTH,
        HISTORY_TREE_DEPTH,
        NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        FIELD_COUNT,
        SUM_FIELD_COUNT,
    } = { ...CircuitConfig.default, ..._settings }

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
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(`Make sure these match what you expect!`)
    console.log(
        '-----------------------------------------------------------------'
    )

    let PoseidonT3
    {
        const poseidonPath = 'poseidon-solidity/PoseidonT3.sol/PoseidonT3.json'
        const poseidonArtifacts = tryPath(poseidonPath)
        const _poseidonFactory = new ethers.ContractFactory(
            poseidonArtifacts.abi,
            poseidonArtifacts.bytecode,
            deployer
        )
        const poseidonFactory = await GlobalFactory(_poseidonFactory)
        PoseidonT3 = await retryAsNeeded(() => poseidonFactory.deploy())
        await PoseidonT3.deployed()
    }

    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))
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

    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))

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
        const _verifierFactory = new ethers.ContractFactory(
            abi,
            bytecode,
            deployer
        )
        const verifierFactory = await GlobalFactory(_verifierFactory)
        const verifierContract = await retryAsNeeded(() =>
            verifierFactory.deploy()
        )
        await verifierContract.deployed()
        verifiers[circuit] = verifierContract.address
    }
    await new Promise((r) => setTimeout(r, DEPLOY_DELAY))

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
                        ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']:
                            PoseidonT3.address,
                    },
                    deployer
                )
            )
        ).deploy(
            {
                stateTreeDepth: STATE_TREE_DEPTH,
                epochTreeDepth: EPOCH_TREE_DEPTH,
                historyTreeDepth: HISTORY_TREE_DEPTH,
                numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
                fieldCount: FIELD_COUNT,
                sumFieldCount: SUM_FIELD_COUNT,
            },
            verifiers[Circuit.signup],
            verifiers[Circuit.userStateTransition],
            verifiers[Circuit.proveReputation],
            verifiers[Circuit.epochKey],
            verifiers[Circuit.epochKeyLite]
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
