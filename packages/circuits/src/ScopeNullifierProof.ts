import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import {
    EpochKeyControl,
    buildEpochKeyControl,
    decodeEpochKeyControl,
} from './utils'

/**
 * The prevent double action proof structure that helps to query the public signals
 */
export class ScopeNullifierProof extends BaseProof {
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
    public chainId: bigint
    public nullifier: bigint

    /**
     * @param _publicSignals The public signals of the prevent double action proof that can be verified by the prover
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
        this.sigData = this.publicSignals[this.idx.sigData]
        this.nullifier = this.publicSignals[this.idx.nullifier]
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        this.circuit = Circuit.scopeNullifier
    }

    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
