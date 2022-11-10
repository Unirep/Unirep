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
function copy(currentDir, outPath) {
    if (!path.isAbsolute(currentDir)) throw new Error('Path is not absolute')
    try {
        fs.mkdirSync(outPath)
    } catch (_) {}
    const contents = fs.readdirSync(currentDir)
    for (const c of contents) {
        const contentPath = path.join(currentDir, c)
        const stat = fs.statSync(contentPath)
        if (stat.isDirectory()) {
            copy(path.join(currentDir, c), path.join(outPath, c))
        } else {
            fs.copyFileSync(contentPath, path.join(outPath, c))
        }
    }
}
copy(path.join(__dirname, '../contracts'), path.join(__dirname, '../build'))
copy(path.join(__dirname, '../abi'), path.join(__dirname, '../build/abi'))
try {
    fs.rmSync(path.join(__dirname, '../build/artifacts/build-info'), {
        recursive: true,
    })
} catch (_) {}
