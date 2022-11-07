/**
 * prepare the build directory
 * after this is run you should `npm publish` from the build directory
 **/

const fs = require('fs')
const path = require('path')

const package = require('../package.json')

fs.writeFileSync(
    path.join(__dirname, '../build/package.json'),
    JSON.stringify({
        ...package,
        main: 'index.js',
        types: 'index.d.ts',
    })
)

fs.copyFileSync(
    path.join(__dirname, '../README.md'),
    path.join(__dirname, '../build/README.md')
)
