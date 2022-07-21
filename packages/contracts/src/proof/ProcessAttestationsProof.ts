import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

/**
 * The process attestations proof structure that helps to query the public signals
 */
export class ProcessAttestationsProof extends BaseProof {
    readonly idx = {
        outputBlindedUserState: 0,
        outputBlindedHashChain: 1,
        inputBlindedUserState: 2,
    }

    public outputBlindedUserState: BigNumberish
    public outputBlindedHashChain: BigNumberish
    public inputBlindedUserState: BigNumberish

    /**
     * @param _publicSignals The public signals of the process attestations proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.outputBlindedUserState =
            _publicSignals[this.idx.outputBlindedUserState]
        this.outputBlindedHashChain =
            _publicSignals[this.idx.outputBlindedHashChain]
        this.inputBlindedUserState =
            _publicSignals[this.idx.inputBlindedUserState]
        this.circuit = Circuit.processAttestations
    }
}
