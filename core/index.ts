import {
    UnirepContract,
} from './UnirepContract'

import {
    Attestation,
    IAttestation,
    IEpochTreeLeaf,
    UnirepState,
} from './UnirepState'

import {
    IUserStateLeaf,
    Reputation,
    UserState,
} from './UserState'

import {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    getTreeDepthsForTesting,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    genNewSMT,
    genUnirepStateFromContract,
    genUserStateFromContract,
    genUserStateFromParams,
} from './utils'

import {
    EPOCH_KEY_NULLIFIER_DOMAIN,
    REPUTATION_NULLIFIER_DOMAIN,
} from '../config/nullifierDomainSeparator'

import {
    attestingFee,
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
    epochLength,
    epochTreeDepth,
    globalStateTreeDepth,
    numEpochKeyNoncePerEpoch,
    numAttestationsPerProof,
    maxUsers,
    maxAttesters,
    userStateTreeDepth,
    maxReputationBudget,
} from '../config/testLocal'

export {
    UnirepContract,
    Attestation,
    IAttestation,
    IEpochTreeLeaf,
    IUserStateLeaf,
    Reputation,
    UnirepState,
    UserState,
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    getTreeDepthsForTesting,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    genNewSMT,
    genUnirepStateFromContract,
    genUserStateFromContract,
    genUserStateFromParams,
    EPOCH_KEY_NULLIFIER_DOMAIN,
    REPUTATION_NULLIFIER_DOMAIN,
    attestingFee,
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
    epochLength,
    epochTreeDepth,
    globalStateTreeDepth,
    numEpochKeyNoncePerEpoch,
    numAttestationsPerProof,
    maxUsers,
    maxAttesters,
    userStateTreeDepth,
    maxReputationBudget,
}