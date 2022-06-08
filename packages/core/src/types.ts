import { UnirepTypes } from '@unirep/contracts'
import {
    IndexedEpochKeyProofEvent,
    IndexedProcessedAttestationsProofEvent,
    IndexedReputationProofEvent,
    IndexedStartedTransitionProofEvent,
    IndexedUserSignedUpProofEvent,
    IndexedUserStateTransitionProofEvent,
} from '@unirep/contracts/build/src/contracts/IUnirep'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { BigNumberish } from 'ethers'

export enum CircuitName {
    verifyEpochKey = 'verifyEpochKey',
    proveReputation = 'proveReputation',
    proveUserSignUp = 'proveUserSignUp',
    startTransition = 'startTransition',
    processAttestations = 'processAttestations',
    userStateTransition = 'userStateTransition',
}

export type CircuitConfig = {
    globalStateTreeDepth: number
    userStateTreeDepth: number
    epochTreeDepth: number
    numAttestationsPerProof: number
    maxReputationBudget: number
    numEpochKeyNoncePerEpoch: number
}

export type StartTransitionProof = {
    blindedUserState: BigNumberish
    blindedHashChain: BigNumberish
    globalStateTree: BigNumberish
    proof: BigNumberish[]
}

export type ProcessAttestationProof = {
    outputBlindedUserState: BigNumberish
    outputBlindedHashChain: BigNumberish
    inputBlindedUserState: BigNumberish
    proof: BigNumberish[]
}

export type ParsedContractInput =
    | UnirepTypes.EpochKeyProofStruct
    | UnirepTypes.ReputationProofStruct
    | UnirepTypes.UserTransitionProofStruct
    | UnirepTypes.SignUpProofStruct
    | StartTransitionProof
    | ProcessAttestationProof

export type UnirepEvents =
    | IndexedEpochKeyProofEvent
    | IndexedProcessedAttestationsProofEvent
    | IndexedReputationProofEvent
    | IndexedUserSignedUpProofEvent
    | IndexedStartedTransitionProofEvent
    | IndexedUserStateTransitionProofEvent

export type VerifyFunction = (
    circuit: CircuitName,
    proof: SnarkProof,
    publicSignals: SnarkPublicSignals
) => Promise<boolean>
