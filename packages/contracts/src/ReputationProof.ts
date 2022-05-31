import { BigNumberish, utils } from 'ethers'
import { SnarkProof } from '@unirep/crypto'
import UnirepCircuit, { CircuitName } from '@unirep/circuits'

import { UnirepTypes } from "./contracts/IUnirep"
import config from './config'

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

    constructor(_publicSignals: BigNumberish[], _proof: SnarkProof) {
        const formattedProof: any[] =
            UnirepCircuit.formatProofForVerifierContract(_proof)
        this.repNullifiers = _publicSignals.slice(0, config.maxReputationBudget)
        this.epoch = _publicSignals[config.maxReputationBudget]
        this.epochKey = _publicSignals[config.maxReputationBudget + 1]
        this.globalStateTree = _publicSignals[config.maxReputationBudget + 2]
        this.attesterId = _publicSignals[config.maxReputationBudget + 3]
        this.proveReputationAmount =
            _publicSignals[config.maxReputationBudget + 4]
        this.minRep = _publicSignals[config.maxReputationBudget + 5]
        this.proveGraffiti = _publicSignals[config.maxReputationBudget + 6]
        this.graffitiPreImage = _publicSignals[config.maxReputationBudget + 7]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            config.exportBuildPath,
            CircuitName.proveReputation,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = utils.defaultAbiCoder.encode(
            [
                `tuple(uint256[${config.maxReputationBudget}] repNullifiers,
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