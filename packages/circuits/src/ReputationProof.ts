import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import {
    buildEpochKeyControl,
    buildReputationControl,
    decodeEpochKeyControl,
    decodeReputationControl,
} from './utils'

/**
 * The reputation proof structure that helps to query the public signals
 */
export class ReputationProof extends BaseProof {
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control0: 2,
        control1: 3,
        graffiti: 4,
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
    public chainId: bigint
    public proveMinRep: bigint
    public proveMaxRep: bigint
    public proveZeroRep: bigint
    public minRep: bigint
    public maxRep: bigint
    public proveGraffiti: bigint
    public graffiti: bigint
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
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control0)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        const {
            minRep,
            maxRep,
            proveMinRep,
            proveMaxRep,
            proveZeroRep,
            proveGraffiti,
        } = decodeReputationControl(this.control1)
        this.minRep = minRep
        this.maxRep = maxRep
        this.proveMinRep = proveMinRep
        this.proveMaxRep = proveMaxRep
        this.proveZeroRep = proveZeroRep
        this.proveGraffiti = proveGraffiti
        this.graffiti = this.publicSignals[this.idx.graffiti]
        this.data = this.publicSignals[this.idx.data]
        this.circuit = Circuit.reputation
    }

    static buildControl({
        attesterId,
        epoch,
        nonce,
        revealNonce,
        chainId,
        proveGraffiti,
        minRep,
        maxRep,
        proveMinRep,
        proveMaxRep,
        proveZeroRep,
    }: any) {
        let control0 = buildEpochKeyControl({
            attesterId: BigInt(attesterId),
            epoch: BigInt(epoch),
            nonce: BigInt(nonce),
            revealNonce: BigInt(revealNonce ?? 0),
            chainId: BigInt(chainId),
        })
        let control1 = buildReputationControl({
            minRep: BigInt(minRep ?? 0),
            maxRep: BigInt(maxRep ?? 0),
            proveMinRep: BigInt(proveMinRep ?? 0),
            proveMaxRep: BigInt(proveMaxRep ?? 0),
            proveZeroRep: BigInt(proveZeroRep ?? 0),
            proveGraffiti: BigInt(proveGraffiti ?? 0),
        })
        return [control0, control1]
    }
}
