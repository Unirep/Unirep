import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

export class SignUpProof extends BaseProof {
    readonly idx = {
        epoch: 0,
        epochKey: 1,
        globalStateTree: 2,
        attesterId: 3,
        userHasSignedUp: 4,
    }

    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public userHasSignedUp: BigNumberish

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
