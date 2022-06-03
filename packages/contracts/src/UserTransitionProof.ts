import { BigNumberish, utils } from 'ethers'
import { SnarkProof } from '@unirep/crypto'
import UnirepCircuit, { CircuitConfig, CircuitName } from '@unirep/circuits'

import { UnirepTypes } from './contracts/IUnirep'
import path from 'path'

export class UserTransitionProof
    implements UnirepTypes.UserTransitionProofStruct
{
    public newGlobalStateTreeLeaf: BigNumberish
    public epkNullifiers: BigNumberish[]
    public transitionFromEpoch: BigNumberish
    public blindedUserStates: BigNumberish[]
    public fromGlobalStateTree: BigNumberish
    public blindedHashChains: BigNumberish[]
    public fromEpochTree: BigNumberish
    public proof: BigNumberish[]
    private publicSignals: BigNumberish[]
    private zkFilesPath: string
    private config: CircuitConfig

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        _zkFilesPath: string
    ) {
        this.zkFilesPath = _zkFilesPath
        this.config = require(path.join(this.zkFilesPath, 'config.json'))
        const formattedProof: any[] =
            UnirepCircuit.formatProofForVerifierContract(_proof)
        this.newGlobalStateTreeLeaf = _publicSignals[0]
        this.epkNullifiers = []
        this.blindedUserStates = []
        this.blindedHashChains = []
        for (let i = 0; i < this.config.numEpochKeyNoncePerEpoch; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i])
        }
        this.transitionFromEpoch =
            _publicSignals[1 + this.config.numEpochKeyNoncePerEpoch]
        this.blindedUserStates.push(
            _publicSignals[2 + this.config.numEpochKeyNoncePerEpoch]
        )
        this.blindedUserStates.push(
            _publicSignals[3 + this.config.numEpochKeyNoncePerEpoch]
        )
        this.fromGlobalStateTree =
            _publicSignals[4 + this.config.numEpochKeyNoncePerEpoch]
        for (let i = 0; i < this.config.numEpochKeyNoncePerEpoch; i++) {
            this.blindedHashChains.push(
                _publicSignals[5 + this.config.numEpochKeyNoncePerEpoch + i]
            )
        }
        this.fromEpochTree =
            _publicSignals[5 + this.config.numEpochKeyNoncePerEpoch * 2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            this.zkFilesPath,
            CircuitName.userStateTransition,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = utils.defaultAbiCoder.encode(
            [
                `tuple(uint256 newGlobalStateTreeLeaf,
                    uint256[${this.config.numEpochKeyNoncePerEpoch}] epkNullifiers,
                    uint256 transitionFromEpoch,
                    uint256[2] blindedUserStates,
                    uint256 fromGlobalStateTree,
                    uint256[${this.config.numEpochKeyNoncePerEpoch}] blindedHashChains,
                    uint256 fromEpochTree,
                    uint256[8] proof)
            `,
            ],
            [this]
        )
        return utils.keccak256(abiEncoder)
    }
}
