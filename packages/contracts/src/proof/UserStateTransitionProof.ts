import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '@unirep/circuits/config'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { hashProof, IProofStruct } from '..'

export class UserTransitionProof implements IProofStruct {
    static readonly idx = {
        newGlobalStateTreeLeaf: 0,
        epkNullifiers: [1, NUM_EPOCH_KEY_NONCE_PER_EPOCH + 1],
        transitionFromEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH + 1,
        blindedUserStates: [
            NUM_EPOCH_KEY_NONCE_PER_EPOCH + 2,
            NUM_EPOCH_KEY_NONCE_PER_EPOCH + 4,
        ],
        fromGlobalStateTree: 4 + NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        blindedHashChains: [
            5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            5 + 2 * NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        ],
        fromEpochTree: 5 + 2 * NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    }

    private _snarkProof: SnarkProof
    private _snarkPublicSignals: SnarkPublicSignals
    public newGlobalStateTreeLeaf: BigNumberish
    public epkNullifiers: BigNumberish[]
    public transitionFromEpoch: BigNumberish
    public blindedUserStates: BigNumberish[]
    public fromGlobalStateTree: BigNumberish
    public blindedHashChains: BigNumberish[]
    public fromEpochTree: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(_publicSignals: SnarkPublicSignals, _proof: SnarkProof) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.newGlobalStateTreeLeaf =
            _publicSignals[
                UserTransitionProof.idx.newGlobalStateTreeLeaf
            ].toString()
        this.epkNullifiers = _publicSignals
            .slice(
                UserTransitionProof.idx.epkNullifiers[0],
                UserTransitionProof.idx.epkNullifiers[1]
            )
            .map((n) => n.toString())
        this.blindedUserStates = _publicSignals
            .slice(
                UserTransitionProof.idx.blindedUserStates[0],
                UserTransitionProof.idx.blindedUserStates[1]
            )
            .map((n) => n.toString())
        this.blindedHashChains = _publicSignals
            .slice(
                UserTransitionProof.idx.blindedHashChains[0],
                UserTransitionProof.idx.blindedHashChains[1]
            )
            .map((n) => n.toString())
        this.transitionFromEpoch =
            _publicSignals[
                UserTransitionProof.idx.transitionFromEpoch
            ].toString()

        this.fromGlobalStateTree =
            _publicSignals[
                UserTransitionProof.idx.fromGlobalStateTree
            ].toString()
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            this.blindedHashChains.push(
                _publicSignals[5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH + i].toString()
            )
        }
        this.fromEpochTree =
            _publicSignals[5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 2].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    public verify = (): Promise<boolean> => {
        return verifyProof(
            Circuit.userStateTransition,
            this._snarkProof,
            this._snarkPublicSignals
        )
    }

    public hash = () => {
        return hashProof(this.publicSignals, this.proof)
    }
}
