const ethers = require('ethers')
const UNIREP = require('../build/artifacts/contracts/Unirep.sol/Unirep.json')
const HELPER = require('../build/artifacts/contracts/verifierHelpers/BaseVerifierHelper.sol/BaseVerifierHelper.json')

// print out all custom errors and its error codes
for (let { abi } of [UNIREP, HELPER]) {
    const iface = new ethers.utils.Interface(abi)
    for (const error of Object.keys(iface.errors)) {
        console.log(error, iface.getSighash(error))
    }
}
