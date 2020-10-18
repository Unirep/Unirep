import { genIdentity, genIdentityCommitment, serialiseIdentity } from 'libsemaphore'

const configureSubparser = (subparsers: any) => {
    subparsers.addParser(
        'genUnirepIdentity',
        { addHelp: true },
    )
}

const genUnirepIdentity = async (args: any) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    const id = genIdentity()
    const commitment = genIdentityCommitment(id)

    const serializedIdentity = serialiseIdentity(id)
    const serializedIdentityCommitment = commitment.toString(16)
    console.log('Identity:', serializedIdentity)
    console.log('Identity Commitment:', serializedIdentityCommitment)
}

export {
    genUnirepIdentity,
    configureSubparser,
}