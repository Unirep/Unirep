import { BigNumber, BigNumberish, ethers } from 'ethers'
import { hash5, SnarkProof } from '@unirep/crypto'
import UnirepCircuit, { CircuitConfig, CircuitName } from '@unirep/circuits'
import ContractConfig, { zkFilesPath } from './config'

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
import path from 'path'

export type Field = BigNumberish
const circuitConfig: CircuitConfig = require(path.join(zkFilesPath, 'config.json'))

enum Event {
    UserSignedUp,
    UserStateTransitioned,
    AttestationSubmitted,
    EpochEnded,
}

enum AttestationEvent {
    SendAttestation,
    Airdrop,
    SpendReputation,
}

interface IAttestation {
    attesterId: BigNumber
    posRep: BigNumber
    negRep: BigNumber
    graffiti: BigNumber
    signUp: BigNumber
    hash(): BigInt
}

interface IEpochKeyProof {
    globalStateTree: Field
    epoch: Field
    epochKey: Field
    proof: Field[]
}

interface IReputationProof {
    repNullifiers: Field[]
    epoch: Field
    epochKey: Field
    globalStateTree: Field
    attesterId: Field
    proveReputationAmount: Field
    minRep: Field
    proveGraffiti: Field
    graffitiPreImage: Field
    proof: Field[]
}

interface ISignUpProof {
    epoch: Field
    epochKey: Field
    globalStateTree: Field
    attesterId: Field
    userHasSignedUp: Field
    proof: Field[]
}

interface IUserTransitionProof {
    newGlobalStateTreeLeaf: Field
    epkNullifiers: Field[]
    transitionFromEpoch: Field
    blindedUserStates: Field[]
    fromGlobalStateTree: Field
    blindedHashChains: Field[]
    fromEpochTree: Field
    proof: Field[]
}

class Attestation implements IAttestation {
    public attesterId: BigNumber
    public posRep: BigNumber
    public negRep: BigNumber
    public graffiti: BigNumber
    public signUp: BigNumber

    constructor(
        _attesterId: BigInt | BigNumberish,
        _posRep: BigInt | BigNumberish,
        _negRep: BigInt | BigNumberish,
        _graffiti: BigInt | BigNumberish,
        _signUp: BigInt | BigNumberish
    ) {
        this.attesterId = ethers.BigNumber.from(_attesterId)
        this.posRep = ethers.BigNumber.from(_posRep)
        this.negRep = ethers.BigNumber.from(_negRep)
        this.graffiti = ethers.BigNumber.from(_graffiti)
        this.signUp = ethers.BigNumber.from(_signUp)
    }

    public hash = (): BigInt => {
        return hash5([
            this.attesterId.toBigInt(),
            this.posRep.toBigInt(),
            this.negRep.toBigInt(),
            this.graffiti.toBigInt(),
            this.signUp.toBigInt(),
        ])
    }
}

// the struct EpochKeyProof in UnirepTypes
class EpochKeyProof implements IEpochKeyProof {
    public globalStateTree: Field
    public epoch: Field
    public epochKey: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: SnarkProof) {
        const formattedProof: any[] = UnirepCircuit.formatProofForVerifierContract(_proof)
        this.globalStateTree = _publicSignals[0]
        this.epoch = _publicSignals[1]
        this.epochKey = _publicSignals[2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            circuitConfig.exportBuildPath,
            CircuitName.verifyEpochKey,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(UnirepFactory.abi)
        const abiEncoder = iface.encodeFunctionData('hashEpochKeyProof', [this])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}

class ReputationProof implements IReputationProof {
    public repNullifiers: Field[]
    public epoch: Field
    public epochKey: Field
    public globalStateTree: Field
    public attesterId: Field
    public proveReputationAmount: Field
    public minRep: Field
    public proveGraffiti: Field
    public graffitiPreImage: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: SnarkProof) {
        const formattedProof: any[] = UnirepCircuit.formatProofForVerifierContract(_proof)
        this.repNullifiers = _publicSignals.slice(0, circuitConfig.maxReputationBudget)
        this.epoch = _publicSignals[circuitConfig.maxReputationBudget]
        this.epochKey = _publicSignals[circuitConfig.maxReputationBudget + 1]
        this.globalStateTree = _publicSignals[circuitConfig.maxReputationBudget + 2]
        this.attesterId = _publicSignals[circuitConfig.maxReputationBudget + 3]
        this.proveReputationAmount = _publicSignals[circuitConfig.maxReputationBudget + 4]
        this.minRep = _publicSignals[circuitConfig.maxReputationBudget + 5]
        this.proveGraffiti = _publicSignals[circuitConfig.maxReputationBudget + 6]
        this.graffitiPreImage = _publicSignals[circuitConfig.maxReputationBudget + 7]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            circuitConfig.exportBuildPath,
            CircuitName.proveReputation,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [
                `tuple(uint256[${circuitConfig.maxReputationBudget}] repNullifiers,
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
            [this]
        )
        return ethers.utils.keccak256(abiEncoder)
    }
}

class SignUpProof implements ISignUpProof {
    public epoch: Field
    public epochKey: Field
    public globalStateTree: Field
    public attesterId: Field
    public userHasSignedUp: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: SnarkProof) {
        const formattedProof: any[] = UnirepCircuit.formatProofForVerifierContract(_proof)
        this.epoch = _publicSignals[0]
        this.epochKey = _publicSignals[1]
        this.globalStateTree = _publicSignals[2]
        this.attesterId = _publicSignals[3]
        this.userHasSignedUp = _publicSignals[4]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            circuitConfig.exportBuildPath,
            CircuitName.proveUserSignUp,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(UnirepFactory.abi)
        const abiEncoder = iface.encodeFunctionData('hashSignUpProof', [this])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}

class UserTransitionProof implements IUserTransitionProof {
    public newGlobalStateTreeLeaf: Field
    public epkNullifiers: Field[]
    public transitionFromEpoch: Field
    public blindedUserStates: Field[]
    public fromGlobalStateTree: Field
    public blindedHashChains: Field[]
    public fromEpochTree: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: SnarkProof) {
        const formattedProof: any[] = UnirepCircuit.formatProofForVerifierContract(_proof)
        this.newGlobalStateTreeLeaf = _publicSignals[0]
        this.epkNullifiers = []
        this.blindedUserStates = []
        this.blindedHashChains = []
        for (let i = 0; i < circuitConfig.numEpochKeyNoncePerEpoch; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i])
        }
        this.transitionFromEpoch =
            _publicSignals[1 + circuitConfig.numEpochKeyNoncePerEpoch]
        this.blindedUserStates.push(
            _publicSignals[2 + circuitConfig.numEpochKeyNoncePerEpoch]
        )
        this.blindedUserStates.push(
            _publicSignals[3 + circuitConfig.numEpochKeyNoncePerEpoch]
        )
        this.fromGlobalStateTree =
            _publicSignals[4 + circuitConfig.numEpochKeyNoncePerEpoch]
        for (let i = 0; i < circuitConfig.numEpochKeyNoncePerEpoch; i++) {
            this.blindedHashChains.push(
                _publicSignals[5 + circuitConfig.numEpochKeyNoncePerEpoch + i]
            )
        }
        this.fromEpochTree =
            _publicSignals[5 + circuitConfig.numEpochKeyNoncePerEpoch * 2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            circuitConfig.exportBuildPath,
            CircuitName.userStateTransition,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [
                `tuple(uint256 newGlobalStateTreeLeaf,
                    uint256[${circuitConfig.numEpochKeyNoncePerEpoch}] epkNullifiers,
                    uint256 transitionFromEpoch,
                    uint256[2] blindedUserStates,
                    uint256 fromGlobalStateTree,
                    uint256[${circuitConfig.numEpochKeyNoncePerEpoch}] blindedHashChains,
                    uint256 fromEpochTree,
                    uint256[8] proof)
            `,
            ],
            [this]
        )
        return ethers.utils.keccak256(abiEncoder)
    }
}

const computeStartTransitionProofHash = (
    blindedUserState: Field,
    blindedHashChain: Field,
    globalStateTree: Field,
    proof: Field[]
) => {
    const iface = new ethers.utils.Interface(UnirepFactory.abi)
    const abiEncoder = iface.encodeFunctionData('hashStartTransitionProof', [
        blindedUserState,
        blindedHashChain,
        globalStateTree,
        proof,
    ])
    return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
}

const computeProcessAttestationsProofHash = (
    outputBlindedUserState: Field,
    outputBlindedHashChain: Field,
    inputBlindedUserState: Field,
    proof: Field[]
) => {
    const iface = new ethers.utils.Interface(UnirepFactory.abi)
    const abiEncoder = iface.encodeFunctionData(
        'hashProcessAttestationsProof',
        [
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        ]
    )
    return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
}

const rmFuncSigHash = (abiEncoder: string) => {
    return '0x' + abiEncoder.slice(10)
}

const deployUnirep = async (
    deployer: ethers.Signer,
    _settings?: any
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
    const _maxUsers = _settings?.maxUsers ?? ContractConfig.maxUsers
    const _maxAttesters = _settings?.maxAttesters ?? ContractConfig.maxAttesters
    const _epochLength = _settings?.epochLength ?? ContractConfig.epochLength
    const _attestingFee = _settings?.attestingFee ?? ContractConfig.attestingFee

    const c: Unirep = await new UnirepFactory(deployer).deploy(
        {
            globalStateTreeDepth: circuitConfig.globalStateTreeDepth,
            userStateTreeDepth: circuitConfig.userStateTreeDepth,
            epochTreeDepth: circuitConfig.epochTreeDepth,
        },
        {
            maxUsers: _maxUsers,
            maxAttesters: _maxAttesters,
        },
        EpochKeyValidityVerifierContract.address,
        StartTransitionVerifierContract.address,
        ProcessAttestationsVerifierContract.address,
        UserStateTransitionVerifierContract.address,
        ReputationVerifierContract.address,
        UserSignUpVerifierContract.address,
        circuitConfig.numEpochKeyNoncePerEpoch,
        circuitConfig.maxReputationBudget,
        _epochLength,
        _attestingFee
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

const getUnirepContract = (
    addressOrName: string,
    signerOrProvider: ethers.Signer | ethers.providers.Provider
): Unirep => {
    return UnirepFactory.connect(addressOrName, signerOrProvider)
}

export {
    Event,
    AttestationEvent,
    IAttestation,
    IEpochKeyProof,
    IReputationProof,
    ISignUpProof,
    IUserTransitionProof,
    Attestation,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
    deployUnirep,
    getUnirepContract,
    UnirepFactory,
    Unirep,
}
