import { Circuit, Prover } from './type'
import { Groth16Proof } from 'snarkjs'
import { BaseProof } from './BaseProof'
import { buildSignupControl, decodeSignupControl } from './utils'

/**
 * A class representing a [signup proof](https://developer.unirep.io/docs/circuits-api/classes/src.SignupProof). Each of the following properties are public signals for the proof.
 */
export class SignupProof extends BaseProof {
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
     * The [identity commitment](https://semaphore.pse.dev/docs/glossary#identity-commitment) for the user signing up.
     */
    public identityCommitment: bigint
    /**
     * The new state tree leaf for the user. This leaf will contain values for [data](https://developer.unirep.io/docs/protocol/data.md).
     */
    public stateTreeLeaf: bigint
    /**
     * The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.

     */
    public control: bigint
    // decoded data
    /**
     * The attester id for the proof.
     */
    public attesterId: bigint
    /**
     * The epoch the proof was made within.
     */
    public epoch: bigint
    /**
     * The chain id for the proof.
     */
    public chainId: bigint

    /**
     * @param publicSignals The public signals of the user sign up proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     * @example
     * ```ts
     * import { SignupProof } from '@unirep/circuits'
     * const data = new SignupProof(publicSignals, proof)
     * ```
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

    /**
     * Pack several variables into one `bigint` variable.
     * @param config The variables that will be packed.
     * @returns The control
     * @example
     * ```ts
     * SignupProof.buildControl({
     *  epoch,
     *  attesterId,
     *  chainId
     * })
     * ```
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
