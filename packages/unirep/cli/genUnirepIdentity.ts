import base64url from 'base64url'
import { genIdentity, genIdentityCommitment, serialiseIdentity } from '@unirep/crypto'

import { identityPrefix, identityCommitmentPrefix } from "./prefix"

const configureSubparser = (subparsers: any) => {
    subparsers.add_parser(
        'genUnirepIdentity',
        { add_help: true },
    )
}

const genUnirepIdentity = async (args: any) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    const id = genIdentity()
    const commitment = genIdentityCommitment(id)

    const serializedIdentity = serialiseIdentity(id)
    const encodedIdentity = base64url.encode(serializedIdentity)
    console.log(identityPrefix + encodedIdentity)

    const serializedIdentityCommitment = commitment.toString(16)
    const encodedIdentityCommitment = base64url.encode(serializedIdentityCommitment)
    console.log(identityCommitmentPrefix + encodedIdentityCommitment)
}

export {
    genUnirepIdentity,
    configureSubparser,
}