import { BigNumberish, utils } from 'ethers'
import { SnarkProof } from '@unirep/crypto'
import UnirepCircuit, { CircuitName } from '@unirep/circuits'

import { UnirepTypes } from './contracts/IUnirep'
import { rmFuncSigHash } from './utils'
import { UnirepABI } from './abis/Unirep'

export class EpochKeyProof implements UnirepTypes.EpochKeyProofStruct {
    public globalStateTree: BigNumberish
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public proof: BigNumberish[]
    private publicSignals: BigNumberish[]
    private zkFilesPath: string

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        _zkFilesPath: string
    ) {
        const formattedProof: any[] =
            UnirepCircuit.formatProofForVerifierContract(_proof)
        this.globalStateTree = _publicSignals[0]
        this.epoch = _publicSignals[1]
        this.epochKey = _publicSignals[2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
        this.zkFilesPath = _zkFilesPath
    }

    public verify = (): Promise<boolean> => {
        const proof_ = UnirepCircuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return UnirepCircuit.verifyProof(
            this.zkFilesPath,
            CircuitName.verifyEpochKey,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData('hashEpochKeyProof', [this])
        return utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}
