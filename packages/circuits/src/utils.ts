import { CircuitConfig } from './CircuitConfig'

export type EpochKeyControl = {
    nonce: bigint
    epoch: bigint
    attesterId: bigint
    revealNonce: bigint
    chainId: bigint
}

export type ReputationControl = {
    minRep: bigint
    maxRep: bigint
    proveMinRep: bigint
    proveMaxRep: bigint
    proveZeroRep: bigint
    proveGraffiti: bigint
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
    config: any = CircuitConfig
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
    config: any = CircuitConfig
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

export const buildEpochKeyControl = (
    params: EpochKeyControl,
    config: any = CircuitConfig
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
    config: any = CircuitConfig
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
