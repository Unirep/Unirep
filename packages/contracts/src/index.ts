import { BigNumber, BigNumberish, ethers } from 'ethers'
import { add0x, hash5, SnarkProof } from '@unirep/crypto'
import { Circuit, formatProofForSnarkjsVerification, formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { maxUsers, maxAttesters, numEpochKeyNoncePerEpoch, epochLength, attestingFee, maxReputationBudget } from '../config'

import { EpochKeyValidityVerifier, EpochKeyValidityVerifier__factory, ProcessAttestationsVerifier, ProcessAttestationsVerifier__factory, ReputationVerifier, ReputationVerifier__factory, StartTransitionVerifier, StartTransitionVerifier__factory, Unirep, Unirep__factory, UserSignUpVerifier, UserSignUpVerifier__factory, UserStateTransitionVerifier, UserStateTransitionVerifier__factory } from '../typechain'

export type Field = BigNumberish 

enum Event {
    UserSignedUp,
    UserStateTransitioned,
    AttestationSubmitted,
    EpochEnded
}

enum AttestationEvent {
    SendAttestation,
    Airdrop,
    SpendReputation
}

interface IAttestation {
    attesterId: BigNumber;
    posRep: BigNumber;
    negRep: BigNumber;
    graffiti: BigNumber;
    signUp: BigNumber;
    hash(): BigInt;
}

interface IEpochKeyProof {
    globalStateTree: Field;
    epoch: Field;
    epochKey: Field;
    proof: Field[];
}

interface IReputationProof {
    repNullifiers: Field[],
    epoch: Field;
    epochKey: Field;
    globalStateTree: Field;
    attesterId: Field;
    proveReputationAmount: Field;
    minRep: Field;
    proveGraffiti: Field;
    graffitiPreImage: Field;
    proof: Field[];
}

interface ISignUpProof {
    epoch: Field;
    epochKey: Field;
    globalStateTree: Field;
    attesterId: Field;
    userHasSignedUp: Field;
    proof: Field[];
}

interface IUserTransitionProof {
    newGlobalStateTreeLeaf: Field;
    epkNullifiers: Field[];
    transitionFromEpoch: Field;
    blindedUserStates: Field[];
    fromGlobalStateTree: Field;
    blindedHashChains: Field[];
    fromEpochTree: Field;
    proof: Field[];
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
        _signUp: BigInt | BigNumberish,
    ) {
        this.attesterId = ethers.BigNumber.from(_attesterId)
        this.posRep = ethers.BigNumber.from(_posRep);
        this.negRep = ethers.BigNumber.from(_negRep);
        this.graffiti = ethers.BigNumber.from(_graffiti);
        this.signUp = ethers.BigNumber.from(_signUp);
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

// the struct EpochKeyProof in UnirepObjs
class EpochKeyProof implements IEpochKeyProof {
    public globalStateTree: Field
    public epoch: Field
    public epochKey: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(
        _publicSignals: Field[],
        _proof: SnarkProof
    ) {
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.globalStateTree = _publicSignals[0]
        this.epoch = _publicSignals[1]
        this.epochKey = _publicSignals[2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return verifyProof(Circuit.verifyEpochKey, proof_, this.publicSignals.map(n => BigInt(n.toString())))
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(Unirep__factory.abi)
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

    constructor(
        _publicSignals: Field[],
        _proof: SnarkProof
    ) {
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.repNullifiers = _publicSignals.slice(0, maxReputationBudget)
        this.epoch = _publicSignals[maxReputationBudget]
        this.epochKey = _publicSignals[maxReputationBudget + 1]
        this.globalStateTree = _publicSignals[maxReputationBudget + 2]
        this.attesterId = _publicSignals[maxReputationBudget + 3]
        this.proveReputationAmount = _publicSignals[maxReputationBudget + 4]
        this.minRep = _publicSignals[maxReputationBudget + 5]
        this.proveGraffiti = _publicSignals[maxReputationBudget + 6]
        this.graffitiPreImage = _publicSignals[maxReputationBudget + 7]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return verifyProof(Circuit.proveReputation, proof_, this.publicSignals.map(n => BigInt(n.toString())))
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [`tuple(uint256[${maxReputationBudget}] repNullifiers,
                    uint256 epoch,
                    uint256 epochKey, 
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 proveReputationAmount,
                    uint256 minRep,
                    uint256 proveGraffiti,
                    uint256 graffitiPreImage,
                    uint256[8] proof)
            `],
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

    constructor(
        _publicSignals: Field[],
        _proof: SnarkProof
    ) {
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.epoch = _publicSignals[0]
        this.epochKey = _publicSignals[1]
        this.globalStateTree = _publicSignals[2]
        this.attesterId = _publicSignals[3]
        this.userHasSignedUp = _publicSignals[4]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return verifyProof(Circuit.proveUserSignUp, proof_, this.publicSignals.map(n => BigInt(n.toString())))
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(Unirep__factory.abi)
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

    constructor(
        _publicSignals: Field[],
        _proof: SnarkProof
    ) {
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.newGlobalStateTreeLeaf = _publicSignals[0]
        this.epkNullifiers = []
        this.blindedUserStates = []
        this.blindedHashChains = []
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i])
        }
        this.transitionFromEpoch = _publicSignals[1 + numEpochKeyNoncePerEpoch]
        this.blindedUserStates.push(_publicSignals[2 + numEpochKeyNoncePerEpoch])
        this.blindedUserStates.push(_publicSignals[3 + numEpochKeyNoncePerEpoch])
        this.fromGlobalStateTree = _publicSignals[4 + numEpochKeyNoncePerEpoch]
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            this.blindedHashChains.push(_publicSignals[5 + numEpochKeyNoncePerEpoch + i])
        }
        this.fromEpochTree = _publicSignals[5 + numEpochKeyNoncePerEpoch * 2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return verifyProof(Circuit.userStateTransition, proof_, this.publicSignals.map(n => BigInt(n.toString())))
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [`tuple(uint256 newGlobalStateTreeLeaf,
                    uint256[${numEpochKeyNoncePerEpoch}] epkNullifiers,
                    uint256 transitionFromEpoch,
                    uint256[2] blindedUserStates,
                    uint256 fromGlobalStateTree,
                    uint256[${numEpochKeyNoncePerEpoch}] blindedHashChains,
                    uint256 fromEpochTree,
                    uint256[8] proof)
            `],
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
    const iface = new ethers.utils.Interface(Unirep__factory.abi)
    const abiEncoder = iface.encodeFunctionData(
        'hashStartTransitionProof',
        [
            blindedUserState,
            blindedHashChain,
            globalStateTree,
            proof
        ]
    )
    return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
}

const computeProcessAttestationsProofHash = (
    outputBlindedUserState: Field,
    outputBlindedHashChain: Field,
    inputBlindedUserState: Field,
    proof: Field[]
) => {
    const iface = new ethers.utils.Interface(Unirep__factory.abi)
    const abiEncoder = iface.encodeFunctionData(
        'hashProcessAttestationsProof',
        [
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        ]
    )
    return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
}

const rmFuncSigHash = (abiEncoder: string) => {
    return add0x(abiEncoder.slice(10,))
}

const deployUnirep = async (
    deployer: ethers.Signer,
    _treeDepths: any,
    _settings?: any): Promise<Unirep> => {
    let EpochKeyValidityVerifierContract: EpochKeyValidityVerifier;
    let StartTransitionVerifierContract: StartTransitionVerifier;
    let ProcessAttestationsVerifierContract: ProcessAttestationsVerifier;
    let UserStateTransitionVerifierContract: UserStateTransitionVerifier;
    let ReputationVerifierContract: ReputationVerifier;
    let UserSignUpVerifierContract: UserSignUpVerifier;

    console.log('Deploying EpochKeyValidityVerifier')
    EpochKeyValidityVerifierContract = await (new EpochKeyValidityVerifier__factory(deployer)).deploy();
    await EpochKeyValidityVerifierContract.deployTransaction.wait()

    console.log('Deploying StartTransitionVerifier')
    StartTransitionVerifierContract = await (new StartTransitionVerifier__factory(deployer)).deploy();
    await StartTransitionVerifierContract.deployTransaction.wait()

    console.log('Deploying ProcessAttestationsVerifier')
    ProcessAttestationsVerifierContract = await (new ProcessAttestationsVerifier__factory(deployer)).deploy()
    await ProcessAttestationsVerifierContract.deployTransaction.wait()

    console.log('Deploying UserStateTransitionVerifier')
    UserStateTransitionVerifierContract = await (new UserStateTransitionVerifier__factory(deployer)).deploy()
    await UserStateTransitionVerifierContract.deployTransaction.wait()

    console.log('Deploying ReputationVerifier')
    ReputationVerifierContract = await (new ReputationVerifier__factory(deployer)).deploy()
    await ReputationVerifierContract.deployTransaction.wait()

    console.log('Deploying UserSignUpVerifier')
    UserSignUpVerifierContract = await (new UserSignUpVerifier__factory(deployer)).deploy()
    await UserSignUpVerifierContract.deployTransaction.wait()

    console.log('Deploying Unirep')
    let _maxUsers, _maxAttesters, _numEpochKeyNoncePerEpoch, _maxReputationBudget, _epochLength, _attestingFee
    if (_settings) {
        _maxUsers = _settings.maxUsers
        _maxAttesters = _settings.maxAttesters,
            _numEpochKeyNoncePerEpoch = _settings.numEpochKeyNoncePerEpoch
        _maxReputationBudget = _settings.maxReputationBudget
        _epochLength = _settings.epochLength
        _attestingFee = _settings.attestingFee
    } else {
        _maxUsers = maxUsers
        _maxAttesters = maxAttesters
        _numEpochKeyNoncePerEpoch = numEpochKeyNoncePerEpoch
        _maxReputationBudget = maxReputationBudget,
            _epochLength = epochLength
        _attestingFee = attestingFee
    }

    const c: Unirep = await (new Unirep__factory(deployer)).deploy(
        _treeDepths,
        {
            "maxUsers": _maxUsers,
            "maxAttesters": _maxAttesters,
        },
        EpochKeyValidityVerifierContract.address,
        StartTransitionVerifierContract.address,
        ProcessAttestationsVerifierContract.address,
        UserStateTransitionVerifierContract.address,
        ReputationVerifierContract.address,
        UserSignUpVerifierContract.address,
        _numEpochKeyNoncePerEpoch,
        _maxReputationBudget,
        _epochLength,
        _attestingFee,
    )

    await c.deployTransaction.wait()

    // Print out deployment info
    console.log("-----------------------------------------------------------------")
    console.log("Bytecode size of Unirep:", Math.floor(Unirep__factory.bytecode.length / 2), "bytes")
    let receipt = await c.provider.getTransactionReceipt(c.deployTransaction.hash)
    console.log("Gas cost of deploying Unirep:", receipt.gasUsed.toString())
    console.log("-----------------------------------------------------------------")

    return c;
}

const getUnirepContract = (addressOrName: string, signerOrProvider: ethers.Signer | ethers.providers.Provider | undefined) => {
    return new ethers.Contract(
        addressOrName,
        Unirep__factory.abi,
        signerOrProvider,
    )
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
}

