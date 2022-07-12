const fs = require('fs')
const path = require('path')

const { abi } = require('../build/artifacts/contracts/Unirep.sol/Unirep.json')

try {
    fs.mkdirSync(path.join(__dirname, '../src/abi'))   
} catch (_) {}
fs.writeFileSync(
    path.join(__dirname, '../src/abi/Unirep.json'),
    JSON.stringify(abi),

)
