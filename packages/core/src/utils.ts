import { BigNumber, ethers } from 'ethers'
import { Event } from '@unirep/contracts'
import {
    hash5,
    hashLeftRight,
    SparseMerkleTree,
    SnarkBigInt,
    stringifyBigInts,
    unstringifyBigInts,
} from '@unirep/crypto'

import Reputation from './Reputation'
import {
    EPOCH_KEY_NULLIFIER_DOMAIN,
    REPUTATION_NULLIFIER_DOMAIN,
} from '../config/nullifierDomainSeparator'
import {
    formatProofForSnarkjsVerification,
    EPOCH_TREE_DEPTH,
    defaultProver,
} from '@unirep/circuits'

export const encodeBigIntArray = (arr: BigInt[]): string => {
    return JSON.stringify(stringifyBigInts(arr))
}

export const decodeBigIntArray = (input: string): bigint[] => {
    return unstringifyBigInts(JSON.parse(input))
}

const defaultUserStateLeaf = hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new SparseMerkleTree(treeDepth, defaultUserStateLeaf)
    return t.root
}

const computeInitUserStateRoot = (
    treeDepth: number,
    leafIdx?: number,
    airdropPosRep: number = 0
): BigInt => {
    const t = new SparseMerkleTree(treeDepth, defaultUserStateLeaf)
    if (typeof leafIdx === 'number' && leafIdx > 0) {
        const airdropReputation = new Reputation(
            BigInt(airdropPosRep),
            BigInt(0),
            BigInt(0),
            BigInt(1)
        )
        const leafValue = airdropReputation.hash()
        t.update(BigInt(leafIdx), leafValue)
    }
    return t.root
}

const genEpochKey = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number,
    epochTreeDepth: number = EPOCH_TREE_DEPTH
): SnarkBigInt => {
    const values: any[] = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ]
    let epochKey = hash5(values).valueOf()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(2 ** epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyNullifier = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number
): SnarkBigInt => {
    return hash5([
        EPOCH_KEY_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0),
    ])
}

const genReputationNullifier = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number,
    attesterId: BigInt
): SnarkBigInt => {
    return hash5([
        REPUTATION_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        attesterId,
    ])
}

const verifyEpochKeyProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args?.proof
    const emptyArray: BigNumber[] = []
    const formatPublicSignals = emptyArray
        .concat(args?.globalStateTree, args?.epoch, args?.epochKey)
        .map((n) => n.toBigInt())
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await defaultProver.verifyProof(
        Circuit.verifyEpochKey,
        formatPublicSignals,
        formatProof
    )
    return isProofValid
}

const verifyReputationProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args?.proof
    const emptyArray: BigNumber[] = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.repNullifiers,
            args?.epoch,
            args?.epochKey,
            args?.globalStateTree,
            args?.attesterId,
            args?.proveReputationAmount,
            args?.minRep,
            args?.proveGraffiti,
            args?.graffitiPreImage
        )
        .map((n) => n.toBigInt())
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await defaultProver.verifyProof(
        Circuit.proveReputation,
        formatPublicSignals,
        formatProof
    )
    return isProofValid
}

const verifySignUpProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args?.proof
    const emptyArray: BigNumber[] = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.epoch,
            args?.epochKey,
            args?.globalStateTree,
            args?.attesterId,
            args?.userHasSignedUp
        )
        .map((n) => n.toBigInt())
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await defaultProver.verifyProof(
        Circuit.proveUserSignUp,
        formatPublicSignals,
        formatProof
    )
    return isProofValid
}

const verifyStartTransitionProofEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args
    const emptyArray: BigNumber[] = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.blindedUserState,
            args?.blindedHashChain,
            args?.globalStateTree
        )
        .map((n) => n.toBigInt())
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await defaultProver.verifyProof(
        Circuit.startTransition,
        formatPublicSignals,
        formatProof
    )
    return isProofValid
}

const verifyProcessAttestationEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const args = event?.args
    const emptyArray: BigNumber[] = []
    const formatPublicSignals = emptyArray
        .concat(
            args?.outputBlindedUserState,
            args?.outputBlindedHashChain,
            args?.inputBlindedUserState
        )
        .map((n) => n.toBigInt())
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await defaultProver.verifyProof(
        Circuit.processAttestations,
        formatPublicSignals,
        formatProof
    )
    return isProofValid
}

const verifyUserStateTransitionEvent = async (
    event: ethers.Event
): Promise<boolean> => {
    const transitionArgs = event?.args?.proof
    const emptyArray: BigNumber[] = []
    let formatPublicSignals = emptyArray
        .concat(
            transitionArgs.newGlobalStateTreeLeaf,
            transitionArgs.epkNullifiers,
            transitionArgs.transitionFromEpoch,
            transitionArgs.blindedUserStates,
            transitionArgs.fromGlobalStateTree,
            transitionArgs.blindedHashChains,
            transitionArgs.fromEpochTree
        )
        .map((n) => n.toBigInt())
    let formatProof = formatProofForSnarkjsVerification(transitionArgs.proof)
    const isProofValid = await defaultProver.verifyProof(
        Circuit.userStateTransition,
        formatPublicSignals,
        formatProof
    )
    return isProofValid
}

const verifyUSTEvents = async (
    transitionEvent: ethers.Event,
    startTransitionEvent: ethers.Event,
    processAttestationEvents: ethers.Event[]
): Promise<boolean> => {
    // verify the final UST proof
    const isValid = await verifyUserStateTransitionEvent(transitionEvent)
    if (!isValid) return false

    // verify the start transition proof
    const isStartTransitionProofValid = await verifyStartTransitionProofEvent(
        startTransitionEvent
    )
    if (!isStartTransitionProofValid) return false

    // verify process attestations proofs
    const transitionArgs = transitionEvent?.args?.proof
    const isProcessAttestationValid = await verifyProcessAttestationEvents(
        processAttestationEvents,
        transitionArgs.blindedUserStates[0],
        transitionArgs.blindedUserStates[1]
    )
    if (!isProcessAttestationValid) return false
    return true
}

const verifyProcessAttestationEvents = async (
    processAttestationEvents: ethers.Event[],
    startBlindedUserState: ethers.BigNumber,
    finalBlindedUserState: ethers.BigNumber
): Promise<boolean> => {
    let currentBlindedUserState = startBlindedUserState
    // The rest are process attestations proofs
    for (let i = 0; i < processAttestationEvents.length; i++) {
        const args = processAttestationEvents[i]?.args
        const isValid = await verifyProcessAttestationEvent(
            processAttestationEvents[i]
        )
        if (!isValid) return false
        currentBlindedUserState = args?.outputBlindedUserState
    }
    return currentBlindedUserState.eq(finalBlindedUserState)
}

export {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    formatProofForSnarkjsVerification,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
}
