import fs from 'fs/promises'

async function tmpFile(file) {
    for (;;) {
        const suffix = Math.floor(Math.random() * 100000000).toString()
        const _file = `${file}-tmp-${suffix}`
        try {
            await fs.stat(_file)
        } catch (err) {
            if (err.toString().indexOf('no such file or directory') !== -1)
                return _file
        }
    }
}

export const copyAtomic = async (from, to) => {
    const tmpTo = await tmpFile(to)
    await fs.copyFile(from, tmpTo)
    await fs.rename(tmpTo, to)
}
