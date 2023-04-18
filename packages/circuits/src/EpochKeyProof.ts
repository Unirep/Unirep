import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'

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
        this.revealNonce = (BigInt(this.control) >> BigInt(232)) & BigInt(1)
        this.attesterId =
            (BigInt(this.control) >> BigInt(72)) &
            ((BigInt(1) << BigInt(160)) - BigInt(1))
        this.epoch =
            (BigInt(this.control) >> BigInt(8)) &
            ((BigInt(1) << BigInt(64)) - BigInt(1))
        this.nonce =
            BigInt(this.control) & ((BigInt(1) << BigInt(8)) - BigInt(1))
        this.data = this.publicSignals[this.idx.data]
        this.circuit = Circuit.epochKey
    }

    static buildControl({ attesterId, epoch, nonce, revealNonce }: any) {
        let control = BigInt(0)
        control += BigInt(revealNonce ?? 0) << BigInt(232)
        control += BigInt(attesterId) << BigInt(72)
        control += BigInt(epoch) << BigInt(8)
        control += BigInt(nonce) * BigInt(revealNonce ?? 0)
        return control
    }
}
