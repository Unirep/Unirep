import {
    IReputation,
    IEpochTreeLeaf,
    IUserStateLeaf,
    ISettings,
    IUnirepState,
    IUserState,
} from './interfaces'

import Reputation from './Reputation'
import UnirepState from './UnirepState'
import UserState from './UserState'

import {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    formatProofForSnarkjsVerification,
    verifyEpochKeyProofEvent,
    verifyReputationProofEvent,
    verifySignUpProofEvent,
    verifyStartTransitionProofEvent,
    verifyProcessAttestationEvent,
    verifyProcessAttestationEvents,
    verifyUserStateTransitionEvent,
    verifyUSTEvents,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    genNewSMT,
    genUnirepState,
    genUserState,
} from './utils'

import {
    EPOCH_KEY_NULLIFIER_DOMAIN,
    REPUTATION_NULLIFIER_DOMAIN,
} from '../config/nullifierDomainSeparator'

export {
    IEpochTreeLeaf,
    ISettings,
    IUnirepState,
    UnirepState,
    IReputation,
    IUserStateLeaf,
    IUserState,
    Reputation,
    UserState,
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    formatProofForSnarkjsVerification,
    verifyEpochKeyProofEvent,
    verifyReputationProofEvent,
    verifySignUpProofEvent,
    verifyStartTransitionProofEvent,
    verifyProcessAttestationEvent,
    verifyProcessAttestationEvents,
    verifyUserStateTransitionEvent,
    verifyUSTEvents,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    genNewSMT,
    genUnirepState,
    genUserState,
    EPOCH_KEY_NULLIFIER_DOMAIN,
    REPUTATION_NULLIFIER_DOMAIN,
}
