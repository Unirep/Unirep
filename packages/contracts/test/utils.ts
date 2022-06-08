import path from 'path'
import Keyv from 'keyv'
import assert from 'assert'
import { expect } from 'chai'
const snarkjs = require('snarkjs')
import { BigNumber, ContractFactory, ethers, Signer } from 'ethers'
import {
    hash5,
    hashOne,
    SparseMerkleTree,
    SnarkProof,
    genRandomSalt,
    ZkIdentity,
    SnarkBigInt,
} from '@unirep/crypto'

import { ContractConfig, Unirep, UnirepABI, UnirepTypes } from '../src'
import { artifactsPath, config, zkFilesPath } from './testConfig'
import { CircuitName } from '../../circuits/src'
// use the utils in @unirep/circuits for local tests
import {
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genProcessAttestationsCircuitInput,
    genEpochKey as _genEpochKey,
    genStartTransitionCircuitInput,
    genProveSignUpCircuitInput,
    genUserStateTransitionCircuitInput,
} from '../../circuits/test/utils'

const DEFAULT_USER_LEAF = hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const genEpochKey = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = config.epochTreeDepth
) => {
    return _genEpochKey(identityNullifier, epoch, nonce, config.epochTreeDepth)
}

const createVerifierName = (circuit: string) => {
    return `${circuit.charAt(0).toUpperCase() + circuit.slice(1)}Verifier`
}

const deploy = async (deployer: Signer, config: ContractConfig) => {
    const Unirep = require(path.join(
        artifactsPath,
        'contracts/Unirep.sol/Unirep.json'
    ))
    const addrMap = {}

    for (const verifier of Object.keys(CircuitName)) {
        const verifierName = createVerifierName(verifier)
        const artifact = require(path.join(
            artifactsPath,
            'contracts',
            'verifiers',
            `${verifierName}.sol`,
            `${verifierName}.json`
        ))

        console.log(`Deploying ${verifierName}`)
        const factory = new ContractFactory(
            artifact.abi,
            artifact.bytecode,
            deployer
        )
        const contract = await factory.deploy()
        await contract.deployTransaction.wait()

        addrMap[verifier] = contract.address
    }

    console.log('Deploying Unirep')
    const f = new ContractFactory(Unirep.abi, Unirep.bytecode, deployer)
    const c = await f.deploy(
        {
            globalStateTreeDepth: config.globalStateTreeDepth,
            userStateTreeDepth: config.userStateTreeDepth,
            epochTreeDepth: config.epochTreeDepth,
        },
        {
            maxUsers: config.maxUsers,
            maxAttesters: config.maxAttesters,
        },
        addrMap[CircuitName.verifyEpochKey],
        addrMap[CircuitName.startTransition],
        addrMap[CircuitName.processAttestations],
        addrMap[CircuitName.userStateTransition],
        addrMap[CircuitName.proveReputation],
        addrMap[CircuitName.proveUserSignUp],
        config.numEpochKeyNoncePerEpoch,
        config.maxReputationBudget,
        config.epochLength,
        config.attestingFee
    )

    await c.deployTransaction.wait()

    // Print out deployment info
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(
        'Bytecode size of Unirep:',
        Math.floor(Unirep.bytecode.length / 2),
        'bytes'
    )
    const receipt = await c.provider.getTransactionReceipt(
        c.deployTransaction.hash
    )
    console.log('Gas cost of deploying Unirep:', receipt.gasUsed.toString())
    console.log(
        '-----------------------------------------------------------------'
    )
    return c as Unirep
}

const genIdentity = () => {
    const id = new ZkIdentity()
    const commitment = id.genIdentityCommitment()
    return { id, commitment }
}

const attesterSignUp = async (contract: Unirep, account: Signer) => {
    const tx = await contract.connect(account).attesterSignUp()
    const receipt = await tx.wait()
    return receipt.status
}

const setAirdrop = async (
    contract: Unirep,
    account: Signer,
    amount: number
) => {
    const attesterAddress = await account.getAddress()
    const tx = await contract.connect(account).setAirdropAmount(amount)
    const receipt = await tx.wait()
    expect(receipt.status).equal(1)
    const airdroppedAmount = await contract
        .connect(account)
        .airdropAmount(attesterAddress)
    expect(airdroppedAmount.toNumber()).equal(amount)
}

const getAirdropReputationRecords = async (
    contract: Unirep,
    id: ZkIdentity
) => {
    const reputationRecords = {}
    const signUpFilter = contract.filters.UserSignedUp()
    const signUpEvents = await contract.queryFilter(signUpFilter)

    let attesterId_
    for (const event of signUpEvents) {
        if (
            event.args.identityCommitment.eq(
                BigNumber.from(id.genIdentityCommitment())
            )
        ) {
            attesterId_ = event.args.attesterId.toNumber()
            reputationRecords[attesterId_] = new Reputation(
                event.args.airdropAmount.toBigInt(),
                BigInt(0),
                BigInt(0),
                event.args.airdropAmount.toNumber() ? BigInt(1) : BigInt(0)
            )
        }
    }
    return reputationRecords
}

const genProofAndVerify = async (circuit: CircuitName, circuitInputs) => {
    const { proof, publicSignals } = await genProof(circuit, circuitInputs)

    return verifyProof(circuit, publicSignals, proof)
}

const formatProofAndPublicSignals = (
    circuit: CircuitName,
    proof: SnarkProof,
    publicSignals: any[]
) => {
    let result
    const formattedProof: any[] = [
        proof.pi_a[0],
        proof.pi_a[1],
        proof.pi_b[0][1],
        proof.pi_b[0][0],
        proof.pi_b[1][1],
        proof.pi_b[1][0],
        proof.pi_c[0],
        proof.pi_c[1],
    ]
    if (circuit === CircuitName.proveUserSignUp) {
        result = {
            epoch: publicSignals[0],
            epochKey: publicSignals[1],
            globalStateTree: publicSignals[2],
            attesterId: publicSignals[3],
            userHasSignedUp: publicSignals[4],
        } as UnirepTypes.SignUpProofStruct
    } else if (circuit === CircuitName.verifyEpochKey) {
        result = {
            globalStateTree: publicSignals[0],
            epoch: publicSignals[1],
            epochKey: publicSignals[2],
        } as UnirepTypes.EpochKeyProofStruct
    } else if (circuit === CircuitName.startTransition) {
        result = {
            blindedUserState: publicSignals[0],
            blindedHashChain: publicSignals[1],
            globalStateTree: publicSignals[2],
        }
    } else if (circuit === CircuitName.proveReputation) {
        result = {
            repNullifiers: publicSignals.slice(0, config.maxReputationBudget),
            epoch: publicSignals[config.maxReputationBudget],
            epochKey: publicSignals[config.maxReputationBudget + 1],
            globalStateTree: publicSignals[config.maxReputationBudget + 2],
            attesterId: publicSignals[config.maxReputationBudget + 3],
            proveReputationAmount:
                publicSignals[config.maxReputationBudget + 4],
            minRep: publicSignals[config.maxReputationBudget + 5],
            proveGraffiti: publicSignals[config.maxReputationBudget + 6],
            graffitiPreImage: publicSignals[config.maxReputationBudget + 7],
        } as UnirepTypes.ReputationProofStruct
    } else if (circuit === CircuitName.processAttestations) {
        result = {
            outputBlindedUserState: publicSignals[0],
            outputBlindedHashChain: publicSignals[1],
            inputBlindedUserState: publicSignals[2],
        }
    } else if (circuit === CircuitName.userStateTransition) {
        const epkNullifiers: string[] = []
        const blindedUserStates = [
            publicSignals[2 + config.numEpochKeyNoncePerEpoch],
            publicSignals[3 + config.numEpochKeyNoncePerEpoch],
        ]
        const blindedHashChains: string[] = []
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(publicSignals[1 + i])
        }
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            blindedHashChains.push(
                publicSignals[5 + config.numEpochKeyNoncePerEpoch + i]
            )
        }

        result = {
            newGlobalStateTreeLeaf: publicSignals[0],
            epkNullifiers,
            transitionFromEpoch:
                publicSignals[1 + config.numEpochKeyNoncePerEpoch],
            blindedUserStates,
            fromGlobalStateTree:
                publicSignals[4 + config.numEpochKeyNoncePerEpoch],
            blindedHashChains,
            fromEpochTree:
                publicSignals[5 + config.numEpochKeyNoncePerEpoch * 2],
        } as UnirepTypes.UserTransitionProofStruct
    } else {
        throw new TypeError(`circuit ${circuit} is not defined`)
    }
    return {
        proof: formattedProof,
        ...result,
    }
}

const rmFuncSigHash = (abiEncoder: string) => {
    return '0x' + abiEncoder.slice(10)
}

const keccak256Hash = (circuit: CircuitName, input) => {
    if (circuit === CircuitName.processAttestations) {
        const iface = new ethers.utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData(
            'hashProcessAttestationsProof',
            [
                input.outputBlindedUserState,
                input.outputBlindedHashChain,
                input.inputBlindedUserState,
                input.proof,
            ]
        )
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    } else if (circuit === CircuitName.startTransition) {
        const iface = new ethers.utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData(
            'hashStartTransitionProof',
            [
                input.blindedUserState,
                input.blindedHashChain,
                input.globalStateTree,
                input.proof,
            ]
        )
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    } else if (circuit === CircuitName.proveReputation) {
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [
                `tuple(uint256[${config.maxReputationBudget}] repNullifiers,
                    uint256 epoch,
                    uint256 epochKey,
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 proveReputationAmount,
                    uint256 minRep,
                    uint256 proveGraffiti,
                    uint256 graffitiPreImage,
                    uint256[8] proof)
            `,
            ],
            [input]
        )
        return ethers.utils.keccak256(abiEncoder)
    } else if (circuit === CircuitName.userStateTransition) {
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [
                `tuple(uint256 newGlobalStateTreeLeaf,
                    uint256[${config.numEpochKeyNoncePerEpoch}] epkNullifiers,
                    uint256 transitionFromEpoch,
                    uint256[2] blindedUserStates,
                    uint256 fromGlobalStateTree,
                    uint256[${config.numEpochKeyNoncePerEpoch}] blindedHashChains,
                    uint256 fromEpochTree,
                    uint256[8] proof)
            `,
            ],
            [input]
        )
        return ethers.utils.keccak256(abiEncoder)
    } else if (circuit === CircuitName.verifyEpochKey) {
        const iface = new ethers.utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData('hashEpochKeyProof', [
            input,
        ])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    } else if (circuit === CircuitName.proveUserSignUp) {
        const iface = new ethers.utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData('hashSignUpProof', [input])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    }
    return ethers.utils.keccak256('123')
}

const genProof = async (circuit: CircuitName, circuitInputs) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        path.join(zkFilesPath, `${circuit}.wasm`),
        path.join(zkFilesPath, `${circuit}.zkey`)
    )
    const endTime = new Date().getTime()
    console.log(`Gen Proof time: ${endTime - startTime} ms`)
    return { proof, publicSignals }
}

const verifyProof = async (circuit: CircuitName, publicSignals, proof) => {
    const vkey = require(path.join(zkFilesPath, `${circuit}.vkey.json`))
    return snarkjs.groth16.verify(vkey, publicSignals, proof)
}

const genInputForContract = async (circuit: CircuitName, circuitInputs) => {
    const { proof, publicSignals } = await genProof(circuit, circuitInputs)

    const input = formatProofAndPublicSignals(circuit, proof, publicSignals)
    return input
}

const genNewUST = () => {
    return new SparseMerkleTree(
        new Keyv(),
        config.userStateTreeDepth,
        DEFAULT_USER_LEAF
    )
}

const bootstrapRandomUSTree = async (): Promise<any> => {
    const expectedNumAttestationsMade = 5
    const userStateTree = await genNewUST()
    let reputationRecords = {}
    // Bootstrap user state for the first `expectedNumAttestationsMade` attesters
    for (let i = 1; i < expectedNumAttestationsMade; i++) {
        const attesterId = BigInt(
            Math.ceil(Math.random() * (2 ** config.userStateTreeDepth - 1))
        )
        if (reputationRecords[attesterId.toString()] === undefined) {
            const signUp = Math.floor(Math.random() * 2)
            reputationRecords[attesterId.toString()] = new Reputation(
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
                BigInt(signUp)
            )
        }
        await userStateTree.update(
            BigInt(attesterId),
            reputationRecords[attesterId.toString()].hash()
        )
    }
    return { userStateTree, reputationRecords }
}

// will be in @unirep/core
interface IReputation {
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
    signUp: BigInt
}

class Reputation implements IReputation {
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public graffitiPreImage: BigInt = BigInt(0)
    public signUp: BigInt

    constructor(
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ) {
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.signUp = _signUp
    }

    public static default(): Reputation {
        return new Reputation(BigInt(0), BigInt(0), BigInt(0), BigInt(0))
    }

    public update = (
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ): Reputation => {
        this.posRep = BigInt(Number(this.posRep) + Number(_posRep))
        this.negRep = BigInt(Number(this.negRep) + Number(_negRep))
        if (_graffiti != BigInt(0)) {
            this.graffiti = _graffiti
        }
        this.signUp = this.signUp || _signUp
        return this
    }

    public addGraffitiPreImage = (_graffitiPreImage: BigInt) => {
        assert(
            hashOne(_graffitiPreImage) === this.graffiti,
            'Graffiti pre-image does not match'
        )
        this.graffitiPreImage = _graffitiPreImage
    }

    public hash = (): BigInt => {
        return hash5([
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
            BigInt(0),
        ])
    }
}

// will be replaced by userState

export {
    deploy,
    genIdentity,
    attesterSignUp,
    setAirdrop,
    getAirdropReputationRecords,
    genProofAndVerify,
    genInputForContract,
    keccak256Hash,
    Reputation,
    genProof,
    verifyProof,
    formatProofAndPublicSignals,
    bootstrapRandomUSTree,
    genEpochKey,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
}
