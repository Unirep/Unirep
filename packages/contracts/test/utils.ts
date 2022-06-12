// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { BigNumberish } from 'ethers'
import * as crypto from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    genProofAndPublicSignals,
} from '@unirep/circuits'
import {
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    GSTZERO_VALUE,
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
    ReputationProof,
    SignUpProof,
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
) => {
    let result
    const formattedProof: any[] = formatProofForVerifierContract(proof)
    if (circuit === Circuit.proveReputation) {
        result = new ReputationProof(publicSignals, proof)
    } else if (circuit === Circuit.verifyEpochKey) {
        result = new EpochKeyProof(publicSignals, proof)
    } else if (circuit === Circuit.proveUserSignUp) {
        result = new SignUpProof(publicSignals, proof)
    } else if (circuit === Circuit.startTransition) {
        result = {
            blindedUserState: publicSignals[0],
            blindedHashChain: publicSignals[1],
            GSTRoot: publicSignals[2],
            proof: formattedProof,
        }
    } else if (circuit === Circuit.processAttestations) {
        result = {
            outputBlindedUserState: publicSignals[0],
            outputBlindedHashChain: publicSignals[1],
            inputBlindedUserState: publicSignals[2],
            proof: formattedProof,
        }
    } else if (circuit === Circuit.userStateTransition) {
        result = new UserTransitionProof(publicSignals, proof)
    } else {
        result = publicSignals.concat([formattedProof])
    }
    return result
}

const genInputForContract = async (circuit: Circuit, circuitInputs) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } = await genProofAndPublicSignals(
        circuit,
        circuitInputs
    )
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )

    const input = formatProofAndPublicSignals(circuit, proof, publicSignals)
    return input
}

export {
    Attestation,
    Reputation,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    GSTZERO_VALUE,
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
