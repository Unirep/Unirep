import { Event, AttestationEvent } from './types/event'

import { Attestation } from './Attestation'

import UnirepContract, {
    Unirep,
    ContractConfig,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    EpochKeyProof,
} from './UnirepContract'

import {
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
} from './utils'

export default UnirepContract
export {
    Unirep,
    ContractConfig,
    Event,
    AttestationEvent,
    Attestation,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
}
