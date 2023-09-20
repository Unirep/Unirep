import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { CircuitConfig } from './CircuitConfig'
import { shiftBits } from './utils'

const { ATTESTER_ID_BITS, EPOCH_BITS, CHAIN_ID_BITS } = CircuitConfig

/**
 * The sign up proof structure that helps to query the public signals
 */
export class SignupProof extends BaseProof {
    readonly idx = {
        identityCommitment: 0,
        stateTreeLeaf: 1,
        control: 2,
    }

    public identityCommitment: bigint
    public stateTreeLeaf: bigint
    public attesterId: bigint
    public epoch: bigint
    public chainId: bigint
    public control: bigint

    /**
     * @param _publicSignals The public signals of the user sign up proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: (bigint | string)[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.identityCommitment =
            this.publicSignals[this.idx.identityCommitment]
        this.stateTreeLeaf = this.publicSignals[this.idx.stateTreeLeaf]
        this.control = this.publicSignals[this.idx.control]
        this.chainId = shiftBits(
            this.control,
            ATTESTER_ID_BITS + EPOCH_BITS,
            CHAIN_ID_BITS
        )
        this.epoch = shiftBits(this.control, ATTESTER_ID_BITS, EPOCH_BITS)
        this.attesterId = shiftBits(this.control, BigInt(0), ATTESTER_ID_BITS)
        this.circuit = Circuit.signup
    }

    static buildControl({ attesterId, epoch, chainId }: any) {
        let control = BigInt(attesterId)
        control += BigInt(epoch) << ATTESTER_ID_BITS
        control += BigInt(chainId) << (ATTESTER_ID_BITS + EPOCH_BITS)
        return control
    }
}
