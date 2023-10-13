import { Circuit, Prover } from './circuits'
import { Groth16Proof } from 'snarkjs'
import { BaseProof } from './BaseProof'
import { CircuitConfig } from './CircuitConfig'

const { ATTESTER_ID_BITS, NONCE_BITS, EPOCH_BITS } = CircuitConfig

/**
 * The prevent double action proof structure that helps to query the public signals
 */
export class PreventDoubleActionProof extends BaseProof {
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control: 2,
        nullifier: 3,
        sigData: 4,
    }
    public revealNonce: bigint
    public attesterId: bigint
    public epoch: bigint
    public nonce: bigint
    public epochKey: bigint
    public stateTreeRoot: bigint
    public control: bigint
    public sigData: bigint
    public nullifier: bigint

    /**
     * @param _publicSignals The public signals of the prevent double action proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: (bigint | string)[],
        _proof: Groth16Proof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epochKey = this.publicSignals[this.idx.epochKey]
        this.stateTreeRoot = this.publicSignals[this.idx.stateTreeRoot]
        this.control = this.publicSignals[this.idx.control]
        this.sigData = this.publicSignals[this.idx.sigData]
        this.nullifier = this.publicSignals[this.idx.nullifier]
        this.revealNonce =
            (BigInt(this.control) >>
                (ATTESTER_ID_BITS + NONCE_BITS + EPOCH_BITS)) &
            BigInt(1)
        this.attesterId =
            (BigInt(this.control) >> (EPOCH_BITS + NONCE_BITS)) &
            ((BigInt(1) << ATTESTER_ID_BITS) - BigInt(1))
        this.epoch =
            (BigInt(this.control) >> NONCE_BITS) &
            ((BigInt(1) << EPOCH_BITS) - BigInt(1))
        this.nonce =
            BigInt(this.control) & ((BigInt(1) << NONCE_BITS) - BigInt(1))
        this.circuit = Circuit.preventDoubleAction
    }
}
