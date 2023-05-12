import child_process from 'child_process'
import os from 'os'
import url from 'url'
import path from 'path'
import { circuitContents } from './circuits.mjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

await import('./downloadPtau.mjs')

const cores = os.cpus().length
console.log(`Building in max ${cores} processes...`)

// pass a space separated list of circuit names to this executable
const [, , ...circuits] = process.argv
if (circuits.length === 0) {
    // if no arguments build all
    circuits.push(...Object.keys(circuitContents))
}

const taskArgs = circuits
    .reduce((acc, circuit, i) => {
        acc[i % cores] = [...(acc[i % cores] || []), circuit]
        return acc
    }, Array(cores).fill(null))
    .filter((i) => !!i)

const promises = []
const processes = []
for (const args of taskArgs) {
    const buildProcess = child_process.fork(
        path.join(__dirname, 'buildSnarks.mjs'),
        args
    )
    processes.push(buildProcess)
    promises.push(
        new Promise((rs, rj) => {
            buildProcess.on('exit', (code) => {
                if (code === 0) return rs()
                processes.map((p) => p.kill())
                rj('received non-0 exit code')
            })
        })
    )
}
await Promise.all(promises)
