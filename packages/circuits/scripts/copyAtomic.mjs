import fs from 'fs/promises'

async function tmpFile(file) {
    for (;;) {
        const suffix = Math.floor(Math.random() * 100000000).toString()
        const _file = `${file}-tmp-${suffix}`
        try {
            await fs.stat(_file)
        } catch (err) {
            if (err.code === 'ENOENT') return _file
        }
    }
}

/**
 * Functionally this moves a file from => to
 * This happens by copy and delete to support
 * moving across logical devices
 **/
export const copyAtomic = async (from, to, unlinkFrom = true) => {
    const tmpTo = await tmpFile(to)
    await fs.copyFile(from, tmpTo)
    await Promise.all([
        fs.rename(tmpTo, to),
        unlinkFrom ? fs.unlink(from) : Promise.resolve(),
    ])
}
