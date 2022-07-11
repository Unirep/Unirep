const fs = require('fs')
const Unirep = require('@unirep/contracts/abi/Unirep.json')

const abiPath = './abis/Unirep.json'
try {
    fs.mkdirSync('./abis')
    fs.writeFileSync(abiPath, JSON.stringify(Unirep))
} catch (_) {}
