import { Circuit, Prover, EpochKeyControl } from './type'
import { Groth16Proof } from 'snarkjs'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

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
        scope: 5,
    }
    // original data
    public epochKey: bigint
    public stateTreeRoot: bigint
    public control: bigint
    public nullifier: bigint
    public sigData: bigint
    public scope: bigint
    // decoded data
    public nonce: bigint
    public epoch: bigint
    public attesterId: bigint
    public revealNonce: bigint
    public chainId: bigint

    /**
     * @param publicSignals The public signals of the prevent double action proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: Groth16Proof,
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

    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
