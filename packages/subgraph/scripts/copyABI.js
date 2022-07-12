const fs = require('fs')
const { abi } = require('@unirep/contracts')

const abiPath = './abis/Unirep.json'
try {
    fs.mkdirSync('./abis')
} catch (_) { }
fs.writeFileSync(abiPath, JSON.stringify(abi))