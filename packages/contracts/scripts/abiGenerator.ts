import fs from 'fs'
import path from 'path'
import prettier from 'prettier'
import { artifactsPath } from './config'

const main = async () => {
    const contract = fs.readFileSync(
        path.join(artifactsPath, 'contracts/Unirep.sol/Unirep.json'),
        'utf8'
    )
    fs.mkdirSync('./src/abis', { recursive: true })

    const artifact = JSON.parse(contract)
    const name = 'Unirep'
    const src = `export const ${name}ABI = ${JSON.stringify(artifact.abi)}`
    const formatted = prettier.format(src, {
        semi: false,
        parser: 'babel',
        singleQuote: true,
    })
    fs.writeFileSync(`./src/abis/${name}.ts`, formatted)
}

void (async () => {
    let exitCode
    try {
        exitCode = await main()
    } catch (err) {
        console.error(err)
        exitCode = 1
    }
    process.exit(exitCode)
})()
