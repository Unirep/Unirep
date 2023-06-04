import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { CircuitConfig } from './CircuitConfig'

const { ATTESTER_ID_BITS, NONCE_BITS, EPOCH_BITS } = CircuitConfig

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class EpochKeyProof extends BaseProof {
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control: 2,
        data: 3,
    }
    public epochKey: bigint
    public stateTreeRoot: bigint
    public control: bigint
    public epoch: bigint
    public attesterId: bigint
    public nonce: bigint
    public revealNonce: bigint
    public data: bigint

    /**
     * @param _publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: (bigint | string)[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epochKey = this.publicSignals[this.idx.epochKey]
        this.stateTreeRoot = this.publicSignals[this.idx.stateTreeRoot]
        this.control = this.publicSignals[this.idx.control]
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
        this.data = this.publicSignals[this.idx.data]
        this.circuit = Circuit.epochKey
    }

    static buildControl({ attesterId, epoch, nonce, revealNonce }: any) {
        let control = BigInt(0)
        control +=
            BigInt(revealNonce ?? 0) <<
            (ATTESTER_ID_BITS + NONCE_BITS + EPOCH_BITS)
        control += BigInt(attesterId) << (EPOCH_BITS + NONCE_BITS)
        control += BigInt(epoch) << NONCE_BITS
        control += BigInt(nonce) * BigInt(revealNonce ?? 0)
        return control
    }
}
