import * as shell from 'shelljs'

const exec = (command: string) => {
    return shell.exec(command, { silent: true })
}

export { exec }