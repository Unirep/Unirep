// @ts-ignore
const path = require('path')
const { ethers } = require('hardhat')
const { circuitConfig, addressMap, artifactsPath } = require('./config')
const { CircuitName } = require('@unirep/circuits')

const createVerifierName = (circuit) => {
    return `${circuit.charAt(0).toUpperCase() + circuit.slice(1)}Verifier`
}

;(async () => {
    const [signer] = await ethers.getSigners()
    const config = {
        attestingFee: ethers.utils.parseEther('0.1'),
        epochLength: 30,
        maxUsers: 10,
        maxAttesters: 10,
        ...circuitConfig,
    }
    const Unirep = require(path.join(
        artifactsPath,
        'contracts',
        'Unirep.sol',
        'Unirep.json'
    ))

    for (const verifier of Object.keys(CircuitName)) {
        if (!addressMap[verifier]) {
            const verifierName = createVerifierName(verifier)
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
                signer
            )

            const contract = await factory.deploy()
            await contract.deployTransaction.wait()

            addressMap[verifier] = contract.address
        }
    }

    console.log('Deploying Unirep')
    const f = new ethers.ContractFactory(Unirep.abi, Unirep.bytecode, signer)
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
        addressMap[CircuitName.verifyEpochKey],
        addressMap[CircuitName.startTransition],
        addressMap[CircuitName.processAttestations],
        addressMap[CircuitName.userStateTransition],
        addressMap[CircuitName.proveReputation],
        addressMap[CircuitName.proveUserSignUp],
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

    console.log(`Unirep address: ${c.address}`)
    return 0
})()
