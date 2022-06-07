/* eslint-disable @typescript-eslint/no-var-requires */
import shelljs from 'shelljs'
import * as fs from 'fs'

import { exportBuildPath, ptau, ptauUrl } from './config'

const fileExists = (filepath: string): boolean => {
    return fs.existsSync(filepath)
}

const main = async (): Promise<number> => {
    const ptauExists = fileExists(ptau)
    if (!ptauExists) {
        fs.mkdirSync(exportBuildPath)
        shelljs.exec(`curl -o ${ptau} ${ptauUrl}`)
    }

    return 0
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
