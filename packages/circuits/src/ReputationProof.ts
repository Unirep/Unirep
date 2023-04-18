import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'

/**
 * The reputation proof structure that helps to query the public signals
 */
export class ReputationProof extends BaseProof {
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control0: 2,
        control1: 3,
        graffitiPreImage: 4,
        data: 5,
    }
    public epochKey: bigint
    public stateTreeRoot: bigint
    public control0: bigint
    public control1: bigint
    public epoch: bigint
    public revealNonce: bigint
    public nonce: bigint
    public attesterId: bigint
    public proveMinRep: bigint
    public proveMaxRep: bigint
    public proveZeroRep: bigint
    public minRep: bigint
    public maxRep: bigint
    public proveGraffiti: bigint
    public graffitiPreImage: bigint
    public data: bigint

    /**
     * @param _publicSignals The public signals of the reputation proof that can be verified by the prover
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
        this.control0 = this.publicSignals[this.idx.control0]
        this.control1 = this.publicSignals[this.idx.control1]
        this.revealNonce = (BigInt(this.control0) >> BigInt(232)) & BigInt(1)
        this.attesterId =
            (BigInt(this.control0) >> BigInt(72)) &
            ((BigInt(1) << BigInt(160)) - BigInt(1))
        this.epoch =
            (BigInt(this.control0) >> BigInt(8)) &
            ((BigInt(1) << BigInt(64)) - BigInt(1))
        this.nonce =
            BigInt(this.control0) & ((BigInt(1) << BigInt(8)) - BigInt(1))
        this.minRep =
            BigInt(this.control1) & ((BigInt(1) << BigInt(64)) - BigInt(1))
        this.maxRep =
            (BigInt(this.control1) >> BigInt(64)) &
            ((BigInt(1) << BigInt(64)) - BigInt(1))
        this.proveMinRep = (BigInt(this.control1) >> BigInt(128)) & BigInt(1)
        this.proveMaxRep = (BigInt(this.control1) >> BigInt(129)) & BigInt(1)
        this.proveZeroRep = (BigInt(this.control1) >> BigInt(130)) & BigInt(1)
        this.proveGraffiti = (BigInt(this.control1) >> BigInt(131)) & BigInt(1)
        this.graffitiPreImage = this.publicSignals[this.idx.graffitiPreImage]
        this.data = this.publicSignals[this.idx.data]
        this.circuit = Circuit.proveReputation
    }

    static buildControl({
        attesterId,
        epoch,
        nonce,
        revealNonce,
        proveGraffiti,
        minRep,
        maxRep,
        proveMinRep,
        proveMaxRep,
        proveZeroRep,
    }: any) {
        let control0 = BigInt(0)
        control0 += BigInt(revealNonce ?? 0) << BigInt(232)
        control0 += BigInt(attesterId) << BigInt(72)
        control0 += BigInt(epoch) << BigInt(8)
        control0 += BigInt(nonce) * BigInt(revealNonce ?? 0)
        let control1 = BigInt(0)
        control1 += BigInt(proveGraffiti ?? 0) << BigInt(131)
        control1 += BigInt(proveZeroRep ?? 0) << BigInt(130)
        control1 += BigInt(proveMaxRep ?? 0) << BigInt(129)
        control1 += BigInt(proveMinRep ?? 0) << BigInt(128)
        control1 += BigInt(maxRep ?? 0) << BigInt(64)
        control1 += BigInt(minRep ?? 0)
        return [control0, control1]
    }
}
