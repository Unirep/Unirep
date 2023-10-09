/**
 * @see https://developer.unirep.io/docs/utils-api/types#snarkpublicsignals
 */
type SnarkPublicSignals = bigint[]

/**
 * @see https://developer.unirep.io/docs/utils-api/types#snarkproof
 */
interface SnarkProof {
    pi_a: bigint[]
    pi_b: bigint[][]
    pi_c: bigint[]
}

export { SnarkPublicSignals, SnarkProof }
