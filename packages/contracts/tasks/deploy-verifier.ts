import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'

const createVerifierName = (circuit: string) => {
    return `${circuit.charAt(0).toUpperCase() + circuit.slice(1)}Verifier`
}

task(`deploy:Verifier`, `Deploy a Verifier contract`)
    .addParam(
        'circuit',
        'Deploy specific circuit verifier',
        undefined,
        types.string
    )
    .setAction(async ({ circuit }, { ethers }): Promise<Contract> => {
        const ContractFactory = await ethers.getContractFactory(
            createVerifierName(circuit)
        )

        const contract = await ContractFactory.deploy()

        await contract.deployed()

        console.log(
            `${circuit} Verifier contract has been deployed to: ${contract.address}`
        )

        return contract
    })
