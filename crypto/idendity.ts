import * as snarkjs from 'snarkjs'
import * as circomlib from 'circomlib'
import * as crypto from 'crypto'

type SnarkBigInt = snarkjs.bigInt
type EddsaPrivateKey = Buffer
type EddsaPublicKey = SnarkBigInt[]

interface EddsaKeyPair {
    pubKey: EddsaPublicKey,
    privKey: EddsaPrivateKey,
}

interface Identity {
    keypair: EddsaKeyPair,
    identityNullifier: SnarkBigInt,
    identityTrapdoor: SnarkBigInt,
}

const pedersenHash = (
    ints: SnarkBigInt[],
): SnarkBigInt => {

    const p = circomlib.babyJub.unpackPoint(
        circomlib.pedersenHash.hash(
            Buffer.concat(
                ints.map(x => x.leInt2Buff(32))
            )
        )
    )

    return snarkjs.bigInt(p[0])
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
        identityNullifier: snarkjs.bigInt.leBuff2int(genRandomBuffer(31)),
        identityTrapdoor: snarkjs.bigInt.leBuff2int(genRandomBuffer(31)),
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
        identityNullifier: snarkjs.bigInt('0x' + data[1]),
        identityTrapdoor: snarkjs.bigInt('0x' + data[2]),
    }
}

const serialiseIdentity = serializeIdentity
const unSerialiseIdentity = unSerializeIdentity

const genIdentityCommitment = (
    identity: Identity,
): SnarkBigInt => {

    return pedersenHash([
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
    genPubKey,
    genIdentity,
    genIdentityCommitment,
    serialiseIdentity,
    unSerialiseIdentity,
}