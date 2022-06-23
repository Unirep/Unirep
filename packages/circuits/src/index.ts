import { SnarkProof } from '@unirep/crypto'

export enum Circuit {
    verifyEpochKey = 'verifyEpochKey',
    proveReputation = 'proveReputation',
    proveUserSignUp = 'proveUserSignUp',
    startTransition = 'startTransition',
    processAttestations = 'processAttestations',
    userStateTransition = 'userStateTransition',
}

export interface Prover {
    verifyProof: (
        name: string | Circuit,
        publicSignals: any,
        proof: any
    ) => Promise<Boolean>

    genProofAndPublicSignals: (
        proofType: string | Circuit,
        inputs: any
    ) => Promise<{
        proof: any
        publicSignals: any
    }>
}

export const formatProofForVerifierContract = (proof: SnarkProof): string[] => {
    return [
        proof.pi_a[0],
        proof.pi_a[1],
        proof.pi_b[0][1],
        proof.pi_b[0][0],
        proof.pi_b[1][1],
        proof.pi_b[1][0],
        proof.pi_c[0],
        proof.pi_c[1],
    ].map((x) => x.toString())
}

export const formatProofForSnarkjsVerification = (
    proof: string[]
): SnarkProof => {
    return {
        pi_a: [BigInt(proof[0]), BigInt(proof[1]), BigInt('1')],
        pi_b: [
            [BigInt(proof[3]), BigInt(proof[2])],
            [BigInt(proof[5]), BigInt(proof[4])],
            [BigInt('1'), BigInt('0')],
        ],
        pi_c: [BigInt(proof[6]), BigInt(proof[7]), BigInt('1')],
    }
}

export { defaultProver, getDefaultVKey } from './defaultProver'
export * from './utils'
export * from '../config'
