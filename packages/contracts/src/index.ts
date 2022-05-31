import { ContractConfig } from './types/config'
import { UnirepEvent, AttestationEvent } from './types/event'
import { Attestation } from './Attestation'
import { EpochKeyProof } from './EpochKeyProof'
import { SignUpProof } from './SignUpProof'
import { ReputationProof } from './ReputationProof'
import { UserTransitionProof } from './UserTransitionProof'

import UnirepContract, { Unirep } from './UnirepContract'

import {
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
} from './utils'

export default UnirepContract
export {
    Unirep,
    ContractConfig,
    UnirepEvent,
    AttestationEvent,
    Attestation,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
}
