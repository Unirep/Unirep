import assert from 'assert'
import * as crypto from 'crypto'
import * as snarkjs from 'snarkjs'
import { poseidon } from 'circomlib'

type SnarkBigInt = snarkjs.bigInt
type PrivKey = SnarkBigInt
type Plaintext = SnarkBigInt[]

const bigInt = snarkjs.bigInt

const SNARK_FIELD_SIZE = snarkjs.bigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
)

/* Poseidon parameters are generated from a script to meet the security requirements described in the papar.
 * Check circuits/README.md for detail.
 */
interface PoseidonParams {
  t: number;
  roundFull: number;
  roundPartial: number;
  seed: string;
}
  
const POSEIDON_SEED = 'poseidon'

const POSEIDON_T3_PARAMS: PoseidonParams = {
  t: 3,
  roundFull: 8,
  roundPartial: 49,
  seed: POSEIDON_SEED
}

const poseidonCreateHash = (param: PoseidonParams) => {
  return poseidon.createHash(param.t, param.roundFull, param.roundPartial, param.seed)
}

// Hash up to 2 elements
const poseidonT3 = poseidonCreateHash(POSEIDON_T3_PARAMS)

/*
* A convenience function for to use poseidon to hash a single SnarkBigInt
*/
const hashOne = (preImage: SnarkBigInt): SnarkBigInt => {

  return poseidonT3([preImage, bigInt(0)])
}

/*
* A convenience function for to use poseidon to hash two SnarkBigInts
*/
const hashLeftRight = (left: SnarkBigInt, right: SnarkBigInt): SnarkBigInt => {
  return poseidonT3([left, right])
}

const genRandomBabyJubValue: SnarkBigInt = (
  ) => {
  
      // Check whether we are using the correct value for SNARK_FIELD_SIZE
      assert(SNARK_FIELD_SIZE.eq(snarkjs.bn128.r))
  
      // Prevent modulo bias
      const min = (
          (snarkjs.bigInt(2).pow(snarkjs.bigInt(256))) - SNARK_FIELD_SIZE
      ) % SNARK_FIELD_SIZE
  
      let rand: SnarkBigInt
  
      while (true) {
          rand = snarkjs.bigInt('0x' + crypto.randomBytes(32).toString('hex'))
  
          if (rand >= min) {
              break
          }
      }
  
      const privKey: PrivKey = rand % SNARK_FIELD_SIZE
      assert(privKey < SNARK_FIELD_SIZE)
  
      return privKey
  }

const genRandomSalt: PrivKey = () => {

  return genRandomBabyJubValue()
}

export {
  PoseidonParams,
  POSEIDON_T3_PARAMS,
  hashOne,
  hashLeftRight,
  genRandomSalt,
}