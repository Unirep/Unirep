import { BigNumberish, ethers, utils } from 'ethers'
import path from 'path'
import {
    MAX_USERS,
    MAX_ATTESTERS,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    MAX_REPUTATION_BUDGET,
    EPOCH_LENGTH,
    GLOBAL_STATE_TREE_DEPTH,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    NUM_ATTESTATIONS_PER_PROOF,
} from '@unirep/circuits'
import {
    VerifyEpochKeyVerifier,
    VerifyEpochKeyVerifier__factory,
    ProcessAttestationsVerifier,
    ProcessAttestationsVerifier__factory,
    ProveReputationVerifier,
    ProveReputationVerifier__factory,
    StartTransitionVerifier,
    StartTransitionVerifier__factory,
    Unirep,
    Unirep__factory as UnirepFactory,
    ProveUserSignUpVerifier,
    ProveUserSignUpVerifier__factory,
    UserStateTransitionVerifier,
    UserStateTransitionVerifier__factory,
} from '../typechain'
import poseidon from '../src/poseidon'

const ATTESTING_FEE = 0

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
        userStateTreeDepth?: BigNumberish
        epochTreeDepth?: BigNumberish
        numEpochKeyNoncePerEpoch?: BigNumberish
        maxReputationBudget?: BigNumberish
        numAttestationsPerProof?: BigNumberish
        epochLength?: BigNumberish
        attestingFee?: BigNumberish
        maxUsers?: BigNumberish
        maxAttesters?: BigNumberish
    } = {}
): Promise<Unirep> => {
    let EpochKeyValidityVerifierContract: VerifyEpochKeyVerifier
    let StartTransitionVerifierContract: StartTransitionVerifier
    let ProcessAttestationsVerifierContract: ProcessAttestationsVerifier
    let UserStateTransitionVerifierContract: UserStateTransitionVerifier
    let ReputationVerifierContract: ProveReputationVerifier
    let UserSignUpVerifierContract: ProveUserSignUpVerifier

    console.log('Deploying EpochKeyValidityVerifier')
    EpochKeyValidityVerifierContract =
        await new VerifyEpochKeyVerifier__factory(deployer).deploy()
    await EpochKeyValidityVerifierContract.deployTransaction.wait()

    console.log('Deploying StartTransitionVerifier')
    StartTransitionVerifierContract =
        await new StartTransitionVerifier__factory(deployer).deploy()
    await StartTransitionVerifierContract.deployTransaction.wait()

    console.log('Deploying ProcessAttestationsVerifier')
    ProcessAttestationsVerifierContract =
        await new ProcessAttestationsVerifier__factory(deployer).deploy()
    await ProcessAttestationsVerifierContract.deployTransaction.wait()

    console.log('Deploying UserStateTransitionVerifier')
    UserStateTransitionVerifierContract =
        await new UserStateTransitionVerifier__factory(deployer).deploy()
    await UserStateTransitionVerifierContract.deployTransaction.wait()

    console.log('Deploying ReputationVerifier')
    ReputationVerifierContract = await new ProveReputationVerifier__factory(
        deployer
    ).deploy()
    await ReputationVerifierContract.deployTransaction.wait()

    console.log('Deploying UserSignUpVerifier')
    UserSignUpVerifierContract = await new ProveUserSignUpVerifier__factory(
        deployer
    ).deploy()
    await UserSignUpVerifierContract.deployTransaction.wait()

    console.log('Deploying Unirep')

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
        {
            globalStateTreeDepth: GLOBAL_STATE_TREE_DEPTH,
            userStateTreeDepth: USER_STATE_TREE_DEPTH,
            epochTreeDepth: EPOCH_TREE_DEPTH,
            numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: MAX_REPUTATION_BUDGET,
            numAttestationsPerProof: NUM_ATTESTATIONS_PER_PROOF,
            epochLength: EPOCH_LENGTH,
            attestingFee: ATTESTING_FEE,
            maxUsers: MAX_USERS,
            maxAttesters: MAX_ATTESTERS,
            ..._settings,
        },
        EpochKeyValidityVerifierContract.address,
        StartTransitionVerifierContract.address,
        ProcessAttestationsVerifierContract.address,
        UserStateTransitionVerifierContract.address,
        ReputationVerifierContract.address,
        UserSignUpVerifierContract.address
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
