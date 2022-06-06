// @ts-ignore
const { ethers } = require('hardhat')
const UnirepCircuit = require('@unirep/circuits')
const path = require('path')
const UnirepContract = require('../src')

const zkFilesPath = path.join(__dirname, '../../circuits/zksnarkBuild')
const artifactsPath = path.join(__dirname, '../../contracts/build/artifacts')
const circuitConfig = UnirepCircuit.default.getConfig(zkFilesPath)

;(async () => {
    const [signer] = await ethers.getSigners()
    const config = {
        attestingFee: ethers.utils.parseEther('0.1'),
        epochLength: 30,
        maxUsers: 10,
        maxAttesters: 10,
        ...circuitConfig,
    }
    const unirep = await UnirepContract.default.deploy(
        artifactsPath,
        signer,
        config
    )
    await unirep.deployed()
    console.log(`Unirep address: ${unirep.address}`)
    return 0
})()
