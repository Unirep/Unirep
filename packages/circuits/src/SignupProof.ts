import { Circuit, Prover } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildSignupControl, decodeSignupControl } from './utils'

/**
 * The sign up proof structure that helps to query the public signals
 */
export class SignupProof extends BaseProof {
    readonly idx = {
        identityCommitment: 0,
        stateTreeLeaf: 1,
        control: 2,
    }

    // original data
    public identityCommitment: string
    public stateTreeLeaf: string
    public control: string
    // decoded data
    public attesterId: bigint
    public epoch: bigint
    public chainId: bigint

    /**
     * @param _publicSignals The public signals of the user sign up proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(_publicSignals: string[], _proof: SnarkProof, prover?: Prover) {
        super(_publicSignals, _proof, prover)
        this.identityCommitment =
            this.publicSignals[this.idx.identityCommitment]
        this.stateTreeLeaf = this.publicSignals[this.idx.stateTreeLeaf]
        this.control = this.publicSignals[this.idx.control]
        const { chainId, epoch, attesterId } = decodeSignupControl(this.control)
        this.chainId = chainId
        this.epoch = epoch
        this.attesterId = attesterId
        this.circuit = Circuit.signup
    }

    static buildControl({ attesterId, epoch, chainId }: any) {
        const control = buildSignupControl({
            attesterId: BigInt(attesterId),
            epoch: BigInt(epoch),
            chainId: BigInt(chainId),
        })
        return control
    }
}
