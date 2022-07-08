// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { BigNumberish } from 'ethers'
import * as crypto from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    defaultProver,
} from '@unirep/circuits'
import {
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    Reputation,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    toCompleteHexString,
    genEpochKey,
    genEpochKeyNullifier,
    bootstrapRandomUSTree,
    genEpochKeyCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    genProofAndVerify,
} from '../../circuits/test/utils'

import {
    Attestation,
    EpochKeyProof,
    ProcessAttestationsProof,
    ReputationProof,
    SignUpProof,
    StartTransitionProof,
    UserTransitionProof,
} from '../src'

export type Field = BigNumberish

const defaultGSTLeaf = (treeDepth: number): BigInt => {
    const USTRoot = computeEmptyUserStateRoot(treeDepth)
    return crypto.hashLeftRight(BigInt(0), USTRoot)
}

const formatProofAndPublicSignals = (
    circuit: Circuit,
    proof: crypto.SnarkProof,
    publicSignals: any[]
): any => {
    const formattedProof: any[] = formatProofForVerifierContract(proof)
    switch (circuit) {
        case Circuit.proveReputation:
            return new ReputationProof(publicSignals, proof, defaultProver)
        case Circuit.verifyEpochKey:
            return new EpochKeyProof(publicSignals, proof, defaultProver)
        case Circuit.proveUserSignUp:
            return new SignUpProof(publicSignals, proof, defaultProver)
        case Circuit.startTransition:
            return new StartTransitionProof(publicSignals, proof, defaultProver)
        case Circuit.processAttestations:
            return new ProcessAttestationsProof(
                publicSignals,
                proof,
                defaultProver
            )
        case Circuit.userStateTransition:
            return new UserTransitionProof(publicSignals, proof, defaultProver)
        default:
            return publicSignals.concat([formattedProof])
    }
}

const genInputForContract = async (circuit: Circuit, circuitInputs) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } =
        await defaultProver.genProofAndPublicSignals(circuit, circuitInputs)
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )
    return formatProofAndPublicSignals(circuit, proof, publicSignals)
}

export {
    Attestation,
    Reputation,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    defaultGSTLeaf,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    toCompleteHexString,
    genEpochKey,
    genEpochKeyNullifier,
    bootstrapRandomUSTree,
    genEpochKeyCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    formatProofAndPublicSignals,
    genProofAndVerify,
    genInputForContract,
}
