import { Circuit, Prover } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildSignupControl, decodeSignupControl } from './utils'

/**
 * @see https://developer.unirep.io/docs/circuits-api/signup-proof
 */
export class SignupProof extends BaseProof {
    // TODO: update docs
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        identityCommitment: 0,
        stateTreeLeaf: 1,
        control: 2,
    }

    // original data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/signup-proof#identitycommitment
     */
    public identityCommitment: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/signup-proof#statetreeleaf
     */
    public stateTreeLeaf: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/signup-proof#control
     */
    public control: bigint
    // decoded data
    public attesterId: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/signup-proof#epoch
     */
    public epoch: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/signup-proof#chainid
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
        this.identityCommitment = BigInt(
            this.publicSignals[this.idx.identityCommitment]
        )
        this.stateTreeLeaf = BigInt(this.publicSignals[this.idx.stateTreeLeaf])
        this.control = BigInt(this.publicSignals[this.idx.control])
        const { chainId, epoch, attesterId } = decodeSignupControl(this.control)
        this.chainId = chainId
        this.epoch = epoch
        this.attesterId = attesterId
        this.circuit = Circuit.signup
    }

    /**
     * @see https://developer.unirep.io/docs/circuits-api/signup-proof#buildcontrol
     */
    static buildControl({ attesterId, epoch, chainId }: any) {
        const control = buildSignupControl({
            attesterId: BigInt(attesterId),
            epoch: BigInt(epoch),
            chainId: BigInt(chainId),
        })
        return control
    }
}
