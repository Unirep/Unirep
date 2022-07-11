const fs = require('fs')
const path = require('path')

const { abi } = require('../build/artifacts/contracts/Unirep.sol/Unirep.json')

fs.writeFileSync(
    path.join(__dirname, '../abi/Unirep.json'),
    JSON.stringify(abi)
)
