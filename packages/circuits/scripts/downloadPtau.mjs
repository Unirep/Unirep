import url from 'url'
import path from 'path'
import https from 'https'
import readline from 'readline'
import fs from 'fs'
import os from 'os'

import { copyAtomic } from './copyAtomic.mjs'
import { ptauName } from './circuits.mjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const outDir = path.join(__dirname, '../zksnarkBuild')
await fs.promises.mkdir(outDir, { recursive: true })
const buildDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'zksnarkBuild-')
)
const ptau = path.join(outDir, ptauName)

const ptauExists = await fs.promises.stat(ptau).catch(() => false)
if (!ptauExists) {
    // download to a temporary file and then move it into place
    const tmp = path.join(buildDir, 'ptau.download.tmp')
    await fs.promises.unlink(tmp).catch(() => {})
    await new Promise((rs, rj) => {
        const logPercent = (p) => {
            readline.clearLine(process.stdout, 0)
            readline.cursorTo(process.stdout, 0)
            process.stdout.write(`Downloading ptau file, please wait... ${p}%`)
        }
        const file = fs.createWriteStream(tmp, { flags: 'w' })
        logPercent(0)
        https.get(
            `https://hermez.s3-eu-west-1.amazonaws.com/${ptauName}`,
            (res) => {
                const { statusCode } = res
                const contentLength = res.headers['content-length']
                if (statusCode !== 200) {
                    return rj(
                        `Received non-200 status code from ptau url: ${statusCode}`
                    )
                }
                let totalReceived = 0
                const logTimer = setInterval(() => {
                    logPercent(
                        Math.floor((100 * totalReceived) / contentLength)
                    )
                }, 1000)
                res.on('data', (chunk) => {
                    file.write(chunk)
                    totalReceived += chunk.length
                })
                res.on('error', (err) => {
                    clearInterval(logTimer)
                    rj(err)
                })
                res.on('end', () => {
                    file.end()
                    clearInterval(logTimer)
                    logPercent(100)
                    console.log()
                    rs()
                })
            }
        )
    })
    await copyAtomic(tmp, path.join(outDir, ptauName))
}
