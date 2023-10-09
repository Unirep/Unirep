import { Circuit, Prover } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import {
    buildEpochKeyControl,
    buildReputationControl,
    decodeEpochKeyControl,
    decodeReputationControl,
} from './utils'

/**
 * @see https://developer.unirep.io/docs/circuits-api/reputation-proof
 */
export class ReputationProof extends BaseProof {
    // TODO: update docs
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control0: 2,
        control1: 3,
        graffiti: 4,
        data: 5,
    }
    // original data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#epochkey
     */
    public epochKey: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#statetreeroot
     */
    public stateTreeRoot: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#control
     */
    public control0: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#control
     */
    public control1: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#graffiti
     */
    public graffiti: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#data
     */
    public data: bigint

    // decoded data
    // control 0
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#nonce
     */
    public nonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#epoch
     */
    public epoch: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#attesterid
     */
    public attesterId: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#revealnonce
     */
    public revealNonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#chainid
     */
    public chainId: bigint
    // control 1
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#minrep
     */
    public minRep: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#maxrep
     */
    public maxRep: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#proveminrep
     */
    public proveMinRep: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#provemaxrep
     */
    public proveMaxRep: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#provezerorep
     */
    public proveZeroRep: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#provegraffiti
     */
    public proveGraffiti: bigint

    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#constructor
     * @param publicSignals The public signals of the proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: SnarkProof,
        prover?: Prover
    ) {
        super(publicSignals, proof, prover)
        this.epochKey = BigInt(this.publicSignals[this.idx.epochKey])
        this.stateTreeRoot = BigInt(this.publicSignals[this.idx.stateTreeRoot])
        this.control0 = BigInt(this.publicSignals[this.idx.control0])
        this.control1 = BigInt(this.publicSignals[this.idx.control1])
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

    /**
     * @see https://developer.unirep.io/docs/circuits-api/reputation-proof#buildcontrol
     */
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
