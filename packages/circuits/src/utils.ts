import { CircuitConfig } from './CircuitConfig'
import { Groth16Proof } from 'snarkjs'
import {
    EpochKeyControl,
    Field,
    ReputationControl,
    SignupControl,
    UserStateTransitionControl,
} from './type'

/**
 * Format snark proof for verifier smart contract
 * @param proof The proof of `SnarkProof` type
 * @returns An one dimensional array of stringified proof data
 */
export const formatProofForVerifierContract = (
    proof: Groth16Proof
): string[] => {
    return [
        proof.pi_a[0],
        proof.pi_a[1],
        proof.pi_b[0][1],
        proof.pi_b[0][0],
        proof.pi_b[1][1],
        proof.pi_b[1][0],
        proof.pi_c[0],
        proof.pi_c[1],
    ]
}

/**
 * Format an one dimensional array for `snarkjs` verification
 * @param proof The string array of the proof
 * @returns The `SnarkProof` type proof data
 */
export const formatProofForSnarkjsVerification = (
    proof: Field[]
): Groth16Proof => {
    return {
        pi_a: [BigInt(proof[0]), BigInt(proof[1]), BigInt('1')].map((x) =>
            x.toString()
        ),
        pi_b: [
            [BigInt(proof[3]), BigInt(proof[2])].map((x) => x.toString()),
            [BigInt(proof[5]), BigInt(proof[4])].map((x) => x.toString()),
            [BigInt('1'), BigInt('0')].map((x) => x.toString()),
        ],
        pi_c: [BigInt(proof[6]), BigInt(proof[7]), BigInt('1')].map((x) =>
            x.toString()
        ),
        protocol: 'groth16',
        curve: 'bn128',
    }
}

export const shiftBits = (
    data: bigint,
    shiftBits: bigint,
    variableBits: bigint
): bigint => {
    return (data >> shiftBits) & ((BigInt(1) << variableBits) - BigInt(1))
}

export const decodeEpochKeyControl = (
    control: bigint,
    config: CircuitConfig = CircuitConfig.default
): EpochKeyControl => {
    const {
        NONCE_BITS,
        EPOCH_BITS,
        ATTESTER_ID_BITS,
        REVEAL_NONCE_BITS,
        CHAIN_ID_BITS,
    } = config
    let accBits = BigInt(0)
    const nonce = shiftBits(control, accBits, NONCE_BITS)
    accBits += NONCE_BITS
    const epoch = shiftBits(control, accBits, EPOCH_BITS)
    accBits += EPOCH_BITS
    const attesterId = shiftBits(control, accBits, ATTESTER_ID_BITS)
    accBits += ATTESTER_ID_BITS
    const revealNonce = shiftBits(control, accBits, REVEAL_NONCE_BITS)
    accBits += REVEAL_NONCE_BITS
    const chainId = shiftBits(control, accBits, CHAIN_ID_BITS)

    return {
        nonce,
        epoch,
        attesterId,
        revealNonce,
        chainId,
    }
}

export const decodeReputationControl = (
    control: bigint,
    config: CircuitConfig = CircuitConfig.default
) => {
    const { REP_BITS, ONE_BIT } = config

    let accBits = BigInt(0)

    const minRep = shiftBits(control, accBits, REP_BITS)
    accBits += REP_BITS

    const maxRep = shiftBits(control, accBits, REP_BITS)
    accBits += REP_BITS

    const proveMinRep = shiftBits(control, accBits, ONE_BIT)
    accBits += ONE_BIT

    const proveMaxRep = shiftBits(control, accBits, ONE_BIT)
    accBits += ONE_BIT

    const proveZeroRep = shiftBits(control, accBits, ONE_BIT)
    accBits += ONE_BIT

    const proveGraffiti = shiftBits(control, accBits, ONE_BIT)

    return {
        minRep,
        maxRep,
        proveMinRep,
        proveMaxRep,
        proveZeroRep,
        proveGraffiti,
    }
}

export const decodeUserStateTransitionControl = (
    control: bigint,
    config: CircuitConfig = CircuitConfig.default
): UserStateTransitionControl => {
    const { ATTESTER_ID_BITS, EPOCH_BITS } = config
    let accBits = BigInt(0)
    const attesterId = shiftBits(control, accBits, ATTESTER_ID_BITS)
    accBits += ATTESTER_ID_BITS

    const toEpoch = shiftBits(control, accBits, EPOCH_BITS)
    return {
        attesterId,
        toEpoch,
    }
}

export const decodeSignupControl = (
    control: bigint,
    config: CircuitConfig = CircuitConfig.default
): SignupControl => {
    const { ATTESTER_ID_BITS, EPOCH_BITS, CHAIN_ID_BITS } = config
    let accBits = BigInt(0)
    const attesterId = shiftBits(control, accBits, ATTESTER_ID_BITS)
    accBits += ATTESTER_ID_BITS

    const epoch = shiftBits(control, accBits, EPOCH_BITS)
    accBits += EPOCH_BITS

    const chainId = shiftBits(control, accBits, CHAIN_ID_BITS)
    return {
        attesterId,
        epoch,
        chainId,
    }
}

export const buildEpochKeyControl = (
    params: EpochKeyControl,
    config: CircuitConfig = CircuitConfig.default
): bigint => {
    const { chainId, revealNonce, attesterId, epoch, nonce } = params
    const { NONCE_BITS, EPOCH_BITS, ATTESTER_ID_BITS, REVEAL_NONCE_BITS } =
        config
    let control = BigInt(0)
    let accBits = BigInt(0)

    control += BigInt(nonce) * BigInt(revealNonce)
    accBits += NONCE_BITS

    control += BigInt(epoch) << accBits
    accBits += EPOCH_BITS

    control += BigInt(attesterId) << accBits
    accBits += ATTESTER_ID_BITS

    control += BigInt(revealNonce) << accBits
    accBits += REVEAL_NONCE_BITS

    control += BigInt(chainId) << accBits

    return control
}

export const buildReputationControl = (
    params: ReputationControl,
    config: CircuitConfig = CircuitConfig.default
): bigint => {
    const {
        minRep,
        maxRep,
        proveMinRep,
        proveMaxRep,
        proveZeroRep,
        proveGraffiti,
    } = params
    const { REP_BITS, ONE_BIT } = config
    let control = BigInt(0)
    let accBits = BigInt(0)
    control += minRep
    accBits += REP_BITS

    control += maxRep << accBits
    accBits += REP_BITS

    control += proveMinRep << accBits
    accBits += ONE_BIT

    control += proveMaxRep << accBits
    accBits += ONE_BIT

    control += proveZeroRep << accBits
    accBits += ONE_BIT

    control += proveGraffiti << accBits

    return control
}

export const buildUserStateTransitionControl = (
    params: UserStateTransitionControl,
    config: CircuitConfig = CircuitConfig.default
): bigint => {
    const { attesterId, toEpoch } = params
    const { ATTESTER_ID_BITS } = config
    let control = BigInt(0)
    let accBits = BigInt(0)

    control += BigInt(attesterId)
    accBits += ATTESTER_ID_BITS

    control += BigInt(toEpoch) << accBits

    return control
}

export const buildSignupControl = (
    params: SignupControl,
    config: CircuitConfig = CircuitConfig.default
): bigint => {
    const { attesterId, epoch, chainId } = params
    const { ATTESTER_ID_BITS, EPOCH_BITS } = config
    let control = BigInt(0)
    let accBits = BigInt(0)

    control += BigInt(attesterId)
    accBits += ATTESTER_ID_BITS

    control += BigInt(epoch) << accBits
    accBits += EPOCH_BITS

    control += BigInt(chainId) << accBits

    return control
}
