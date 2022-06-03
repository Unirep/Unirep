import path from 'path'
import { ethers } from 'ethers'
import { CircuitName } from '@unirep/circuits'

import { UnirepABI } from './abis/Unirep'
import { Unirep } from '../src/contracts'
import { ContractConfig } from './types/config'

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

export { Unirep }
