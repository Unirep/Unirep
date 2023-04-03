/**
 * Type of snark public signals
 */
type SnarkPublicSignals = bigint[]

/**
 * Interface of snark proof
 */
interface SnarkProof {
    pi_a: bigint[]
    pi_b: bigint[][]
    pi_c: bigint[]
}

export { SnarkPublicSignals, SnarkProof }
