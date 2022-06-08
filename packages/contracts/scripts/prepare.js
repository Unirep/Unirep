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
        main: 'src/index.js',
        types: 'src/index.d.ts',
    })
)

fs.copyFileSync(
    path.join(__dirname, '../README.md'),
    path.join(__dirname, '../build/README.md')
)

// copy files from contracts recursively
function copyContracts(currentDir, outPath) {
    if (!path.isAbsolute(currentDir)) throw new Error('Path is not absolute')
    try {
        fs.mkdirSync(outPath)
    } catch (_) {}
    const contents = fs.readdirSync(currentDir)
    for (const c of contents) {
        if (c === 'verifiers') continue
        const contentPath = path.join(currentDir, c)
        const stat = fs.statSync(contentPath)
        if (stat.isDirectory()) {
            copyContracts(path.join(currentDir, c), path.join(outPath, c))
        } else {
            fs.copyFileSync(contentPath, path.join(outPath, c))
        }
    }
}
copyContracts(
    path.join(__dirname, '../contracts'),
    path.join(__dirname, '../build')
)
