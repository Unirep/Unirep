import { Circuit, Prover } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import {
    buildEpochKeyControl,
    buildSpendReputationControl,
    decodeEpochKeyControl,
    decodeSpendReputationControl,
} from './utils'

/**
 * The spend reputation proof structure that helps to query the public signals
 */
export class SpendReputationProof extends BaseProof {
    readonly idx = {
        updatedEpochTreeRoot: 0,
        control: 1,
    }
    public control: bigint

    // decoded data
    // control 0
    public nonce: bigint
    public epoch: bigint
    public attesterId: bigint
    public revealNonce: bigint
    public chainId: bigint
    //output
    public updatedEpochTreeRoot: bigint

    /**
     * @param publicSignals The public signals of the reputation proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: SnarkProof,
        prover?: Prover
    ) {
        super(publicSignals, proof, prover)
        this.updatedEpochTreeRoot = BigInt(
            this.publicSignals[this.idx.updatedEpochTreeRoot]
        )
        this.control = BigInt(this.publicSignals[this.idx.control])
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control)

        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        this.circuit = Circuit.spendReputation
    }

    static buildControl({
        attesterId,
        epoch,
        nonce,
        revealNonce,
        chainId,
    }: any) {
        let control = buildEpochKeyControl({
            attesterId: BigInt(attesterId),
            epoch: BigInt(epoch),
            nonce: BigInt(nonce),
            revealNonce: BigInt(revealNonce ?? 0),
            chainId: BigInt(chainId),
        })
        return control
    }
}
