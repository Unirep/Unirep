import { Circuit, Prover } from '@unirep/circuits'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '@unirep/circuits/config'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

/**
 * The user state transition proof structure that helps to query the public signals
 */
export class UserTransitionProof extends BaseProof {
    readonly idx: any

    public newGlobalStateTreeLeaf: BigNumberish
    public epkNullifiers: BigNumberish[]
    public transitionFromEpoch: BigNumberish
    public blindedUserStates: BigNumberish[]
    public fromGlobalStateTree: BigNumberish
    public blindedHashChains: BigNumberish[]
    public fromEpochTree: BigNumberish

    private numEpochKeyNoncePerEpoch: number

    /**
     * @param _publicSignals The public signals of the user state transition proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover,
        numEpochKeyNoncePerEpoch = NUM_EPOCH_KEY_NONCE_PER_EPOCH
    ) {
        super(_publicSignals, _proof, prover)
        this.numEpochKeyNoncePerEpoch = numEpochKeyNoncePerEpoch
        this.idx = {
            newGlobalStateTreeLeaf: 0,
            fromGlobalStateTree: 1,
            epkNullifiers: [2, this.numEpochKeyNoncePerEpoch + 2],
            transitionFromEpoch: this.numEpochKeyNoncePerEpoch + 2,
            blindedUserStates: [
                this.numEpochKeyNoncePerEpoch + 3,
                this.numEpochKeyNoncePerEpoch + 5,
            ],
            blindedHashChains: [
                6 + this.numEpochKeyNoncePerEpoch,
                7 + 2 * this.numEpochKeyNoncePerEpoch,
            ],
            fromEpochTree: 7 + 2 * this.numEpochKeyNoncePerEpoch,
        }
        this.newGlobalStateTreeLeaf =
            _publicSignals[this.idx.newGlobalStateTreeLeaf]
        this.epkNullifiers = _publicSignals.slice(
            this.idx.epkNullifiers[0],
            this.idx.epkNullifiers[1]
        )
        this.blindedUserStates = _publicSignals.slice(
            this.idx.blindedUserStates[0],
            this.idx.blindedUserStates[1]
        )
        this.blindedHashChains = _publicSignals.slice(
            this.idx.blindedHashChains[0],
            this.idx.blindedHashChains[1]
        )
        this.transitionFromEpoch = _publicSignals[this.idx.transitionFromEpoch]
        this.fromGlobalStateTree = _publicSignals[this.idx.fromGlobalStateTree]
        this.fromEpochTree = _publicSignals[this.idx.fromEpochTree]
        this.circuit = Circuit.userStateTransition
    }
}
