import { Circuit, Prover } from './type'
import { Groth16Proof } from 'snarkjs'
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
    public identityCommitment: bigint
    public stateTreeLeaf: bigint
    public control: bigint
    // decoded data
    public attesterId: bigint
    public epoch: bigint
    public chainId: bigint

    /**
     * @param publicSignals The public signals of the user sign up proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: Groth16Proof,
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

    static buildControl({ attesterId, epoch, chainId }: any) {
        const control = buildSignupControl({
            attesterId: BigInt(attesterId),
            epoch: BigInt(epoch),
            chainId: BigInt(chainId),
        })
        return control
    }
}
