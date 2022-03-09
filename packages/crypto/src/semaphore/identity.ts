import { SnarkBigInt } from 'maci-crypto'
import * as circomlib from 'circomlib'
import * as bigintConversion from 'bigint-conversion';
import * as crypto from 'crypto'

type EddsaPrivateKey = Buffer
type EddsaPublicKey = SnarkBigInt[]
type SnarkWitness = Array<SnarkBigInt>
type SnarkPublicSignals = SnarkBigInt[]

interface EddsaKeyPair {
    pubKey: EddsaPublicKey,
    privKey: EddsaPrivateKey,
}

interface Identity {
    keypair: EddsaKeyPair,
    identityNullifier: SnarkBigInt,
    identityTrapdoor: SnarkBigInt,
}

interface SnarkProof {
    pi_a: SnarkBigInt[]
    pi_b: SnarkBigInt[][]
    pi_c: SnarkBigInt[]
}


const genRandomBuffer = (numBytes: number = 32): Buffer => {
    return crypto.randomBytes(numBytes)
}

const genPubKey = (privKey: EddsaPrivateKey): EddsaPublicKey => {
    const pubKey = circomlib.eddsa.prv2pub(privKey)

    return pubKey
}

const genEddsaKeyPair = (
    privKey: Buffer = genRandomBuffer(),
): EddsaKeyPair => {

    const pubKey = genPubKey(privKey)
    return { pubKey, privKey }
}

const genIdentity = (
    privKey: Buffer = genRandomBuffer(32),
): Identity => {

    // The identity nullifier and identity trapdoor are separate random 31-byte
    // values
    return {
        keypair: genEddsaKeyPair(privKey),
        identityNullifier: bigintConversion.bufToBigint(genRandomBuffer(31)),
        identityTrapdoor: bigintConversion.bufToBigint(genRandomBuffer(31)),
    }
}

const serializeIdentity = (
    identity: Identity,
): string => {
    const data = [
        identity.keypair.privKey.toString('hex'),
        identity.identityNullifier.toString(16),
        identity.identityTrapdoor.toString(16),
    ]
    return JSON.stringify(data)
}

const unSerializeIdentity = (
    serialisedIdentity: string,
): Identity => {
    const data = JSON.parse(serialisedIdentity)
    return {
        keypair: genEddsaKeyPair(Buffer.from(data[0], 'hex')),
        identityNullifier: bigintConversion.hexToBigint(data[1]),
        identityTrapdoor: bigintConversion.hexToBigint(data[2]),
    }
}

const serialiseIdentity = serializeIdentity
const unSerialiseIdentity = unSerializeIdentity

const genIdentityCommitment = (
    identity: Identity,
): SnarkBigInt => {

    return circomlib.poseidon([
        circomlib.babyJub.mulPointEscalar(identity.keypair.pubKey, 8)[0],
        identity.identityNullifier,
        identity.identityTrapdoor,
    ])
}

export {
    Identity,
    EddsaKeyPair,
    EddsaPrivateKey,
    EddsaPublicKey,
    SnarkWitness,
    SnarkPublicSignals,
    SnarkProof,
    SnarkBigInt,
    genPubKey,
    genIdentity,
    genIdentityCommitment,
    serialiseIdentity,
    unSerialiseIdentity,
}
