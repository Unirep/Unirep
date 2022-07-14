/**
 * The name of the main events that can be emitted from Unirep smart contract.
 */
export enum Event {
    UserSignedUp,
    UserStateTransitioned,
    AttestationSubmitted,
    EpochEnded,
}

/**
 * The type of attestation events. They will be verified in different ways.
 */
export enum AttestationEvent {
    SendAttestation,
    Airdrop,
    SpendReputation,
}
