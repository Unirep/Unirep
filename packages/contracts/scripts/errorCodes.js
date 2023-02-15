const ethers = require('ethers')
const ABI = require('../abi/Unirep.json')

// print out all custom errors and its error codes
const iface = new ethers.utils.Interface(ABI)
for (const error of Object.keys(iface.errors)) {
    console.log(error, iface.getSighash(error))
}
