// @ts-ignore
const path = require('path')
const { ethers } = require('hardhat')
const { contractConfig, addressMap, artifactsPath } = require('./config')
const { CircuitName } = require('./circuitName')

const createVerifierName = (circuit) => {
    return `${circuit.charAt(0).toUpperCase() + circuit.slice(1)}Verifier`
}

;(async () => {
    const [signer] = await ethers.getSigners()
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
            globalStateTreeDepth: contractConfig.globalStateTreeDepth,
            userStateTreeDepth: contractConfig.userStateTreeDepth,
            epochTreeDepth: contractConfig.epochTreeDepth,
        },
        {
            maxUsers: contractConfig.maxUsers,
            maxAttesters: contractConfig.maxAttesters,
        },
        addressMap[CircuitName.verifyEpochKey],
        addressMap[CircuitName.startTransition],
        addressMap[CircuitName.processAttestations],
        addressMap[CircuitName.userStateTransition],
        addressMap[CircuitName.proveReputation],
        addressMap[CircuitName.proveUserSignUp],
        contractConfig.numEpochKeyNoncePerEpoch,
        contractConfig.maxReputationBudget,
        contractConfig.epochLength,
        contractConfig.attestingFee
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
