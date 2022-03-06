import { SNARK_FIELD_SIZE, SnarkBigInt, genRandomSalt, hash5, hashOne, hashLeftRight, stringifyBigInts, unstringifyBigInts, IncrementalQuinTree } from 'maci-crypto';
declare const NOTHING_UP_MY_SLEEVE: bigint;
declare const newWrappedPoseidonT3Hash: (...elements: SnarkBigInt[]) => SnarkBigInt;
declare const wrappedPoseidonT3Hash: (...elements: SnarkBigInt[]) => string;
export { NOTHING_UP_MY_SLEEVE, SNARK_FIELD_SIZE, SnarkBigInt, genRandomSalt, hash5, hashOne, hashLeftRight, stringifyBigInts, unstringifyBigInts, IncrementalQuinTree, wrappedPoseidonT3Hash, newWrappedPoseidonT3Hash, };
