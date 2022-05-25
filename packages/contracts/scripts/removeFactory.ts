import fs from 'fs'
import prettier from 'prettier'

const main = async () => {
    const data = fs.readFileSync('./src/contracts/index.ts', 'utf-8')

    const reg = /export[\{\ A-z\_]+factory[\ \}\"\.\/A-z]+factory";\n/gi
    const newData = data.replace(reg, '')
    const formatted = prettier.format(newData, {
        semi: false,
        parser: 'babel',
        singleQuote: true,
    })

    fs.writeFileSync(`./src/contracts/index.ts`, formatted)

    try {
        fs.unlinkSync('./src/contracts/hardhat.d.ts')
    } catch (_) {}

    fs.rmSync('./src/contracts/factories', { recursive: true, force: true })
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
