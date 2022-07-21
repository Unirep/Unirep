import child_process from 'child_process'
import os from 'os'
import url from 'url'
import path from 'path'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const downloadProcess = child_process.fork(
    path.join(__dirname, 'downloadPtau.mjs')
)
await new Promise((rs, rj) =>
    downloadProcess.on('exit', (code) => (code === 0 ? rs() : rj()))
)

const cores = os.cpus().length
console.log(`Building in max ${cores} processes...`)

const circuitNames = [
    'verifyEpochKey',
    'proveReputation',
    'proveUserSignUp',
    'startTransition',
    'processAttestations',
    'userStateTransition',
]

// pass a space separated list of circuit names to this executable
const [, , ...circuits] = process.argv
if (circuits.length === 0) {
    // if no arguments build all
    circuits.push(...circuitNames)
}

const taskArgs = circuits
    .reduce((acc, circuit, i) => {
        acc[i % cores] = [...(acc[i % cores] || []), circuit]
        return acc
    }, Array(cores).fill(null))
    .filter((i) => !!i)

const promises = []
for (const args of taskArgs) {
    const buildProcess = child_process.fork(
        path.join(__dirname, 'buildSnarks.mjs'),
        args
    )
    promises.push(
        new Promise((rs, rj) => {
            buildProcess.on('error', (err) => buildProcess.kill())
            buildProcess.on('exit', (code) => {
                if (code === 0) rs()
                else rj()
            })
        })
    )
}
await Promise.all(promises)
