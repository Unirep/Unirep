import { Circuit, Prover, EpochKeyControl } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

/**
 * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof
 */
export class ScopeNullifierProof extends BaseProof {
    // TODO: update docs
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control: 2,
        nullifier: 3,
        sigData: 4,
        scope: 5,
    }
    // original data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#epochkey
     */
    public epochKey: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#statetreeroot
     */
    public stateTreeRoot: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#control
     */
    public control: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#nullifier
     */
    public nullifier: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#sigdata
     */
    public sigData: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#scope
     */
    public scope: bigint
    // decoded data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#nonce
     */
    public nonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#epoch
     */
    public epoch: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#attesterid
     */
    public attesterId: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#revealnonce
     */
    public revealNonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#chainid
     */
    public chainId: bigint

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
        this.control = BigInt(this.publicSignals[this.idx.control])
        this.nullifier = BigInt(this.publicSignals[this.idx.nullifier])
        this.sigData = BigInt(this.publicSignals[this.idx.sigData])
        this.scope = BigInt(this.publicSignals[this.idx.scope])
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        this.circuit = Circuit.scopeNullifier
    }

    /**
     * @see https://developer.unirep.io/docs/circuits-api/scope-nullifier-proof#buildcontrol
     */
    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
