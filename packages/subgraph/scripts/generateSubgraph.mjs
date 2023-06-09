import Mustache from 'mustache'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

fs.mkdirSync(path.join(__dirname, '../node_modules'))

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
copy(
    path.join(__dirname, '../../../node_modules/assemblyscript'),
    path.join(__dirname, '../node_modules/assemblyscript')
)

copy(
    path.join(__dirname, '../../../node_modules/@graphprotocol'),
    path.join(__dirname, '../node_modules/@graphprotocol')
)

copy(
    path.join(__dirname, '../../../node_modules/matchstick-as'),
    path.join(__dirname, '../node_modules/matchstick-as')
)

const network = process.argv.at(2) ?? 'goerli'

const template = fs.readFileSync('./subgraph.template.yaml', 'utf-8')
const networks = JSON.parse(fs.readFileSync('./networks.json', 'utf-8'))
const subgraph = Mustache.render(template, {
    network,
    ...networks[network].Unirep,
})

fs.writeFileSync('./subgraph.yaml', subgraph)
