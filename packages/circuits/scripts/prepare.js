/**
 * prepare the build directory
 * after this is run you should `npm publish` from the build directory
 **/

const fs = require('fs')
const path = require('path')

const package = require('../package.json')

fs.writeFileSync(
    path.join(__dirname, '../dist/package.json'),
    JSON.stringify({
        ...package,
        main: 'circuits/utils.js',
        types: 'circuits/utils.d.ts',
    })
)

fs.copyFileSync(
    path.join(__dirname, '../README.md'),
    path.join(__dirname, '../dist/README.md')
)

try {
    fs.unlinkSync(
        path.join(
            __dirname,
            '../dist/zksnarkBuild/powersOfTau28_hez_final_17.ptau'
        )
    )
} catch (_) {}
