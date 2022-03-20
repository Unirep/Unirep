'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.maxReputationBudget =
    exports.userStateTreeDepth =
    exports.maxAttesters =
    exports.maxUsers =
    exports.numAttestationsPerProof =
    exports.numEpochKeyNoncePerEpoch =
    exports.globalStateTreeDepth =
    exports.epochTreeDepth =
    exports.epochLength =
    exports.circuitEpochTreeDepth =
    exports.circuitUserStateTreeDepth =
    exports.circuitGlobalStateTreeDepth =
    exports.attestingFee =
    exports.REPUTATION_NULLIFIER_DOMAIN =
    exports.EPOCH_KEY_NULLIFIER_DOMAIN =
    exports.genUserStateFromParams =
    exports.genUserStateFromContract =
    exports.genUnirepStateFromParams =
    exports.genUnirepStateFromContract =
    exports.genNewSMT =
    exports.genReputationNullifier =
    exports.genEpochKeyNullifier =
    exports.genEpochKey =
    exports.verifyUSTEvents =
    exports.verifyUserStateTransitionEvent =
    exports.verifyProcessAttestationEvents =
    exports.verifyProcessAttestationEvent =
    exports.verifyStartTransitionProofEvent =
    exports.verifySignUpProofEvent =
    exports.verifyReputationProofEvent =
    exports.verifyEpochKeyProofEvent =
    exports.formatProofForSnarkjsVerification =
    exports.computeInitUserStateRoot =
    exports.computeEmptyUserStateRoot =
    exports.SMT_ZERO_LEAF =
    exports.SMT_ONE_LEAF =
    exports.defaultUserStateLeaf =
    exports.UserState =
    exports.Reputation =
    exports.UnirepState =
    exports.Attestation =
        void 0
const UnirepState_1 = require('./UnirepState')
Object.defineProperty(exports, 'Attestation', {
    enumerable: true,
    get: function () {
        return UnirepState_1.Attestation
    },
})
Object.defineProperty(exports, 'UnirepState', {
    enumerable: true,
    get: function () {
        return UnirepState_1.UnirepState
    },
})
const UserState_1 = require('./UserState')
Object.defineProperty(exports, 'Reputation', {
    enumerable: true,
    get: function () {
        return UserState_1.Reputation
    },
})
Object.defineProperty(exports, 'UserState', {
    enumerable: true,
    get: function () {
        return UserState_1.UserState
    },
})
const utils_1 = require('./utils')
Object.defineProperty(exports, 'defaultUserStateLeaf', {
    enumerable: true,
    get: function () {
        return utils_1.defaultUserStateLeaf
    },
})
Object.defineProperty(exports, 'SMT_ONE_LEAF', {
    enumerable: true,
    get: function () {
        return utils_1.SMT_ONE_LEAF
    },
})
Object.defineProperty(exports, 'SMT_ZERO_LEAF', {
    enumerable: true,
    get: function () {
        return utils_1.SMT_ZERO_LEAF
    },
})
Object.defineProperty(exports, 'computeEmptyUserStateRoot', {
    enumerable: true,
    get: function () {
        return utils_1.computeEmptyUserStateRoot
    },
})
Object.defineProperty(exports, 'computeInitUserStateRoot', {
    enumerable: true,
    get: function () {
        return utils_1.computeInitUserStateRoot
    },
})
Object.defineProperty(exports, 'formatProofForSnarkjsVerification', {
    enumerable: true,
    get: function () {
        return utils_1.formatProofForSnarkjsVerification
    },
})
Object.defineProperty(exports, 'verifyEpochKeyProofEvent', {
    enumerable: true,
    get: function () {
        return utils_1.verifyEpochKeyProofEvent
    },
})
Object.defineProperty(exports, 'verifyReputationProofEvent', {
    enumerable: true,
    get: function () {
        return utils_1.verifyReputationProofEvent
    },
})
Object.defineProperty(exports, 'verifySignUpProofEvent', {
    enumerable: true,
    get: function () {
        return utils_1.verifySignUpProofEvent
    },
})
Object.defineProperty(exports, 'verifyStartTransitionProofEvent', {
    enumerable: true,
    get: function () {
        return utils_1.verifyStartTransitionProofEvent
    },
})
Object.defineProperty(exports, 'verifyProcessAttestationEvent', {
    enumerable: true,
    get: function () {
        return utils_1.verifyProcessAttestationEvent
    },
})
Object.defineProperty(exports, 'verifyProcessAttestationEvents', {
    enumerable: true,
    get: function () {
        return utils_1.verifyProcessAttestationEvents
    },
})
Object.defineProperty(exports, 'verifyUserStateTransitionEvent', {
    enumerable: true,
    get: function () {
        return utils_1.verifyUserStateTransitionEvent
    },
})
Object.defineProperty(exports, 'verifyUSTEvents', {
    enumerable: true,
    get: function () {
        return utils_1.verifyUSTEvents
    },
})
Object.defineProperty(exports, 'genEpochKey', {
    enumerable: true,
    get: function () {
        return utils_1.genEpochKey
    },
})
Object.defineProperty(exports, 'genEpochKeyNullifier', {
    enumerable: true,
    get: function () {
        return utils_1.genEpochKeyNullifier
    },
})
Object.defineProperty(exports, 'genReputationNullifier', {
    enumerable: true,
    get: function () {
        return utils_1.genReputationNullifier
    },
})
Object.defineProperty(exports, 'genNewSMT', {
    enumerable: true,
    get: function () {
        return utils_1.genNewSMT
    },
})
Object.defineProperty(exports, 'genUnirepStateFromContract', {
    enumerable: true,
    get: function () {
        return utils_1.genUnirepStateFromContract
    },
})
Object.defineProperty(exports, 'genUnirepStateFromParams', {
    enumerable: true,
    get: function () {
        return utils_1.genUnirepStateFromParams
    },
})
Object.defineProperty(exports, 'genUserStateFromContract', {
    enumerable: true,
    get: function () {
        return utils_1.genUserStateFromContract
    },
})
Object.defineProperty(exports, 'genUserStateFromParams', {
    enumerable: true,
    get: function () {
        return utils_1.genUserStateFromParams
    },
})
const nullifierDomainSeparator_1 = require('../config/nullifierDomainSeparator')
Object.defineProperty(exports, 'EPOCH_KEY_NULLIFIER_DOMAIN', {
    enumerable: true,
    get: function () {
        return nullifierDomainSeparator_1.EPOCH_KEY_NULLIFIER_DOMAIN
    },
})
Object.defineProperty(exports, 'REPUTATION_NULLIFIER_DOMAIN', {
    enumerable: true,
    get: function () {
        return nullifierDomainSeparator_1.REPUTATION_NULLIFIER_DOMAIN
    },
})
const testLocal_1 = require('../config/testLocal')
Object.defineProperty(exports, 'attestingFee', {
    enumerable: true,
    get: function () {
        return testLocal_1.attestingFee
    },
})
Object.defineProperty(exports, 'circuitGlobalStateTreeDepth', {
    enumerable: true,
    get: function () {
        return testLocal_1.circuitGlobalStateTreeDepth
    },
})
Object.defineProperty(exports, 'circuitUserStateTreeDepth', {
    enumerable: true,
    get: function () {
        return testLocal_1.circuitUserStateTreeDepth
    },
})
Object.defineProperty(exports, 'circuitEpochTreeDepth', {
    enumerable: true,
    get: function () {
        return testLocal_1.circuitEpochTreeDepth
    },
})
Object.defineProperty(exports, 'epochLength', {
    enumerable: true,
    get: function () {
        return testLocal_1.epochLength
    },
})
Object.defineProperty(exports, 'epochTreeDepth', {
    enumerable: true,
    get: function () {
        return testLocal_1.epochTreeDepth
    },
})
Object.defineProperty(exports, 'globalStateTreeDepth', {
    enumerable: true,
    get: function () {
        return testLocal_1.globalStateTreeDepth
    },
})
Object.defineProperty(exports, 'numEpochKeyNoncePerEpoch', {
    enumerable: true,
    get: function () {
        return testLocal_1.numEpochKeyNoncePerEpoch
    },
})
Object.defineProperty(exports, 'numAttestationsPerProof', {
    enumerable: true,
    get: function () {
        return testLocal_1.numAttestationsPerProof
    },
})
Object.defineProperty(exports, 'maxUsers', {
    enumerable: true,
    get: function () {
        return testLocal_1.maxUsers
    },
})
Object.defineProperty(exports, 'maxAttesters', {
    enumerable: true,
    get: function () {
        return testLocal_1.maxAttesters
    },
})
Object.defineProperty(exports, 'userStateTreeDepth', {
    enumerable: true,
    get: function () {
        return testLocal_1.userStateTreeDepth
    },
})
Object.defineProperty(exports, 'maxReputationBudget', {
    enumerable: true,
    get: function () {
        return testLocal_1.maxReputationBudget
    },
})
