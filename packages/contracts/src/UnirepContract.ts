import path from 'path'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { hash5, SnarkProof } from '@unirep/crypto'
import UnirepCircuit, { CircuitName } from '@unirep/circuits'

import { UnirepTypes } from './contracts/IUnirep'
import { UnirepABI } from './abis/Unirep'
import type { Unirep } from '../src/contracts'
import type { ContractConfig } from './types/config'
import config from './config'
import { rmFuncSigHash } from './utils'

class Attestation implements UnirepTypes.AttestationStruct {
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
class EpochKeyProof implements UnirepTypes.EpochKeyProofStruct {
    public globalStateTree: BigNumberish
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public proof: BigNumberish[]
    private publicSignals: BigNumberish[]

    constructor(_publicSignals: BigNumberish[], _proof: SnarkProof) {
        const formattedProof: any[] =
            UnirepCircuit.formatProofForVerifierContract(_proof)
        this.globalStateTree = ethers.BigNumber.from(_publicSignals[0])
        this.epoch = ethers.BigNumber.from(_publicSignals[1])
        this.epochKey = ethers.BigNumber.from(_publicSignals[2])
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => ethers.BigNumber.from(n))
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            config.exportBuildPath,
            CircuitName.verifyEpochKey,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData('hashEpochKeyProof', [this])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}

class ReputationProof implements UnirepTypes.ReputationProofStruct {
    public repNullifiers: BigNumberish[]
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public proveReputationAmount: BigNumberish
    public minRep: BigNumberish
    public proveGraffiti: BigNumberish
    public graffitiPreImage: BigNumberish
    public proof: BigNumberish[]
    private publicSignals: BigNumberish[]

    constructor(_publicSignals: BigNumberish[], _proof: SnarkProof) {
        const formattedProof: any[] =
            UnirepCircuit.formatProofForVerifierContract(_proof)
        this.repNullifiers = _publicSignals.slice(0, config.maxReputationBudget)
        this.epoch = _publicSignals[config.maxReputationBudget]
        this.epochKey = _publicSignals[config.maxReputationBudget + 1]
        this.globalStateTree = _publicSignals[config.maxReputationBudget + 2]
        this.attesterId = _publicSignals[config.maxReputationBudget + 3]
        this.proveReputationAmount =
            _publicSignals[config.maxReputationBudget + 4]
        this.minRep = _publicSignals[config.maxReputationBudget + 5]
        this.proveGraffiti = _publicSignals[config.maxReputationBudget + 6]
        this.graffitiPreImage = _publicSignals[config.maxReputationBudget + 7]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            config.exportBuildPath,
            CircuitName.proveReputation,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        // array length should be fixed
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
            [this]
        )
        return ethers.utils.keccak256(abiEncoder)
    }
}

class SignUpProof implements UnirepTypes.SignUpProofStruct {
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public userHasSignedUp: BigNumberish
    public proof: BigNumberish[]
    private publicSignals: BigNumberish[]

    constructor(_publicSignals: BigNumberish[], _proof: SnarkProof) {
        const formattedProof: any[] =
            UnirepCircuit.formatProofForVerifierContract(_proof)
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
            config.exportBuildPath,
            CircuitName.proveUserSignUp,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData('hashSignUpProof', [this])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}

class UserTransitionProof implements UnirepTypes.UserTransitionProofStruct {
    public newGlobalStateTreeLeaf: BigNumberish
    public epkNullifiers: BigNumberish[]
    public transitionFromEpoch: BigNumberish
    public blindedUserStates: BigNumberish[]
    public fromGlobalStateTree: BigNumberish
    public blindedHashChains: BigNumberish[]
    public fromEpochTree: BigNumberish
    public proof: BigNumberish[]
    private publicSignals: BigNumberish[]

    constructor(_publicSignals: BigNumberish[], _proof: SnarkProof) {
        const formattedProof: any[] =
            UnirepCircuit.formatProofForVerifierContract(_proof)
        this.newGlobalStateTreeLeaf = _publicSignals[0]
        this.epkNullifiers = []
        this.blindedUserStates = []
        this.blindedHashChains = []
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i])
        }
        this.transitionFromEpoch =
            _publicSignals[1 + config.numEpochKeyNoncePerEpoch]
        this.blindedUserStates.push(
            _publicSignals[2 + config.numEpochKeyNoncePerEpoch]
        )
        this.blindedUserStates.push(
            _publicSignals[3 + config.numEpochKeyNoncePerEpoch]
        )
        this.fromGlobalStateTree =
            _publicSignals[4 + config.numEpochKeyNoncePerEpoch]
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            this.blindedHashChains.push(
                _publicSignals[5 + config.numEpochKeyNoncePerEpoch + i]
            )
        }
        this.fromEpochTree =
            _publicSignals[5 + config.numEpochKeyNoncePerEpoch * 2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            config.exportBuildPath,
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
                    uint256[${config.numEpochKeyNoncePerEpoch}] epkNullifiers,
                    uint256 transitionFromEpoch,
                    uint256[2] blindedUserStates,
                    uint256 fromGlobalStateTree,
                    uint256[${config.numEpochKeyNoncePerEpoch}] blindedHashChains,
                    uint256 fromEpochTree,
                    uint256[8] proof)
            `,
            ],
            [this]
        )
        return ethers.utils.keccak256(abiEncoder)
    }
}

export default class UnirepContract {
    private static createVerifierName = (circuit: string) => {
        return `${circuit.charAt(0).toUpperCase() + circuit.slice(1)}Verifier`
    }

    private static getUnirepArtifact = (
        artifactsPath: string
    ): { abi; bytecode } => {
        const Unirep = require(path.join(
            artifactsPath,
            'contracts',
            'Unirep.sol',
            'Unirep.json'
        ))
        return Unirep
    }

    /**
     * Deploy Unirep contract and verifiers with compiled artifacts
     * @param artifactsPath The path to the artifacts (e.g. ../build/artifacts/)
     * @param deployer The deployer of the contract
     * @param config The config of the contracts and its circuits
     * @returns The Unirep contract object
     */
    public static deploy = async (
        artifactsPath: string,
        deployer: ethers.Signer,
        config: ContractConfig
    ): Promise<Unirep> => {
        const Unirep = this.getUnirepArtifact(artifactsPath)
        const addrMap = {}

        for (const verifier of Object.keys(CircuitName)) {
            const verifierName = this.createVerifierName(verifier)
            const artifact = require(path.join(
                artifactsPath,
                'contracts',
                'verifiers',
                `${verifierName}.sol`,
                `${verifierName}.json`
            ))

            console.log(`Deploying ${verifierName}`)
            const factory = new ethers.ContractFactory(
                artifact.abi,
                artifact.bytecode,
                deployer
            )
            const contract = await factory.deploy()
            await contract.deployTransaction.wait()

            addrMap[verifier] = contract.address
        }

        console.log('Deploying Unirep')
        const f = new ethers.ContractFactory(
            Unirep.abi,
            Unirep.bytecode,
            deployer
        )
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

    /**
     * Get Unirep contract from a specific address
     * @param address The address of the Unirep contract
     * @param signerOrProvider A given signer or provider
     * @param artifactsPath If artifacts path is given, it loads abi from the given artifacts path.
     * Or it loads Unirep abi from exported package
     * @returns The Unirep contract object
     */
    public static get = (
        address: string,
        signerOrProvider?: ethers.Signer | ethers.providers.Provider,
        artifactsPath?: string
    ): Unirep => {
        const abi = artifactsPath
            ? this.getUnirepArtifact(artifactsPath).abi
            : UnirepABI

        return new ethers.Contract(address, abi, signerOrProvider) as Unirep
    }
}

export {
    ContractConfig,
    Attestation,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    Unirep,
    UnirepTypes,
}
