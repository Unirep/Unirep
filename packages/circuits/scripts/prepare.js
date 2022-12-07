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
        main: 'src/index.js',
        types: 'src/index.d.ts',
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

copy(
    path.join(__dirname, '../circuits'),
    path.join(__dirname, '../dist/circuits')
)

// copy files from contracts recursively
function copy(currentDir, outDir) {
    if (!path.isAbsolute(currentDir)) throw new Error('Path is not absolute')
    try {
        fs.mkdirSync(outDir)
    } catch (_) {}
    const contents = fs.readdirSync(currentDir)
    for (const c of contents) {
        const contentPath = path.join(currentDir, c)
        const stat = fs.statSync(contentPath)
        const outPath = path.join(outDir, c)
        if (stat.isDirectory()) {
            copy(path.join(currentDir, c), outPath)
        } else {
            const content = fs.readFileSync(contentPath, 'utf8')
            const newContent = content.replaceAll(
                '../../../node_modules/circomlib',
                '../../../circomlib'
            )
            fs.writeFileSync(outPath, newContent)
        }
    }
}
