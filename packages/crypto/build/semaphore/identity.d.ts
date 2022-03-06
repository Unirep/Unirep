/// <reference types="node" />
import { SnarkBigInt } from 'maci-crypto';
declare type EddsaPrivateKey = Buffer;
declare type EddsaPublicKey = SnarkBigInt[];
declare type SnarkWitness = Array<SnarkBigInt>;
declare type SnarkPublicSignals = SnarkBigInt[];
interface EddsaKeyPair {
    pubKey: EddsaPublicKey;
    privKey: EddsaPrivateKey;
}
interface Identity {
    keypair: EddsaKeyPair;
    identityNullifier: SnarkBigInt;
    identityTrapdoor: SnarkBigInt;
}
interface SnarkProof {
    pi_a: SnarkBigInt[];
    pi_b: SnarkBigInt[][];
    pi_c: SnarkBigInt[];
}
declare const genPubKey: (privKey: EddsaPrivateKey) => EddsaPublicKey;
declare const genIdentity: (privKey?: Buffer) => Identity;
declare const serialiseIdentity: (identity: Identity) => string;
declare const unSerialiseIdentity: (serialisedIdentity: string) => Identity;
declare const genIdentityCommitment: (identity: Identity) => SnarkBigInt;
export { Identity, EddsaKeyPair, EddsaPrivateKey, EddsaPublicKey, SnarkWitness, SnarkPublicSignals, SnarkProof, SnarkBigInt, genPubKey, genIdentity, genIdentityCommitment, serialiseIdentity, unSerialiseIdentity, };
