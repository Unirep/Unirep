import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

/**
 * The sign up proof structure that helps to query the public signals
 */
export class SignUpProof extends BaseProof {
    readonly idx = {
        epochKey: 0,
        globalStateTree: 1,
        epoch: 2,
        attesterId: 3,
        userHasSignedUp: 4,
    }

    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public userHasSignedUp: BigNumberish

    /**
     * @param _publicSignals The public signals of the user sign up proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epoch = _publicSignals[this.idx.epoch]
        this.epochKey = _publicSignals[this.idx.epochKey]
        this.globalStateTree = _publicSignals[this.idx.globalStateTree]
        this.attesterId = _publicSignals[this.idx.attesterId]
        this.userHasSignedUp = _publicSignals[this.idx.userHasSignedUp]
        this.circuit = Circuit.proveUserSignUp
    }
}
