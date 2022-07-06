import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

export class StartTransitionProof extends BaseProof {
    readonly idx = {
        blindedUserState: 0,
        blindedHashChain: 1,
        globalStateTree: 2,
    }

    public blindedUserState: BigNumberish
    public blindedHashChain: BigNumberish
    public globalStateTree: BigNumberish

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.blindedUserState = _publicSignals[this.idx.blindedUserState]
        this.blindedHashChain = _publicSignals[this.idx.blindedHashChain]
        this.globalStateTree = _publicSignals[this.idx.globalStateTree]
        this.circuit = Circuit.startTransition
    }
}
