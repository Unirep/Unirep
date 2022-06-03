import { BigNumberish, utils } from 'ethers'
import { SnarkProof } from '@unirep/crypto'
import UnirepCircuit, { CircuitConfig, CircuitName } from '@unirep/circuits'

import { UnirepTypes } from './contracts/IUnirep'
import path from 'path'

export class ReputationProof implements UnirepTypes.ReputationProofStruct {
    public repNullifiers: BigNumberish[]
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public proveReputationAmount: BigNumberish
    public minRep: BigNumberish
    public proveGraffiti: BigNumberish
    public graffitiPreImage: BigNumberish
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
        this.repNullifiers = _publicSignals.slice(
            0,
            this.config.maxReputationBudget
        )
        this.epoch = _publicSignals[this.config.maxReputationBudget]
        this.epochKey = _publicSignals[this.config.maxReputationBudget + 1]
        this.globalStateTree =
            _publicSignals[this.config.maxReputationBudget + 2]
        this.attesterId = _publicSignals[this.config.maxReputationBudget + 3]
        this.proveReputationAmount =
            _publicSignals[this.config.maxReputationBudget + 4]
        this.minRep = _publicSignals[this.config.maxReputationBudget + 5]
        this.proveGraffiti = _publicSignals[this.config.maxReputationBudget + 6]
        this.graffitiPreImage =
            _publicSignals[this.config.maxReputationBudget + 7]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            this.zkFilesPath,
            CircuitName.proveReputation,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = utils.defaultAbiCoder.encode(
            [
                `tuple(uint256[${this.config.maxReputationBudget}] repNullifiers,
                    uint256 epoch,
                    uint256 epochKey,
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 proveReputationAmount,
                    uint256 minRep,
                    uint256 proveGraffiti,
                    uint256 graffitiPreImage,
                    uint256[8] proof)
            `,
            ],
            [this]
        )
        return utils.keccak256(abiEncoder)
    }
}
