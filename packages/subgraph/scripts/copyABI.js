const fs = require('fs')
const Unirep = require('@unirep/contracts/build/artifacts/contracts/Unirep.sol/Unirep.json')

const abiPath = './abis/Unirep.json'
try {
    fs.mkdirSync('./abis')
    fs.writeFileSync(abiPath, JSON.stringify(Unirep.abi))
} catch (_) {}
