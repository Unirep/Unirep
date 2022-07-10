const fs = require('fs')
const path = require('path')

const ABI = require('../build/artifacts/contracts/Unirep.sol/Unirep.json')
ABI.bytecode = ''
ABI.deployedBytecode = ''

fs.writeFileSync(
    path.join(__dirname, '../abi/Unirep.json'),
    JSON.stringify(ABI)
)
