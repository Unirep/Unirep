/// <reference types="node" />
import { ZkIdentity, Strategy } from '@zk-kit/identity';
import { SnarkBigInt } from './crypto';
declare type EddsaPrivateKey = Buffer;
declare type EddsaPublicKey = SnarkBigInt[];
declare type SnarkWitness = Array<SnarkBigInt>;
declare type SnarkPublicSignals = SnarkBigInt[];
interface SnarkProof {
    pi_a: SnarkBigInt[];
    pi_b: SnarkBigInt[][];
    pi_c: SnarkBigInt[];
}
export { EddsaPrivateKey, EddsaPublicKey, SnarkWitness, SnarkPublicSignals, SnarkProof, SnarkBigInt, ZkIdentity, Strategy, };
