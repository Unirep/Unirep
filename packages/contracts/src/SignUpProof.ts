import { BigNumberish, utils } from 'ethers'
import { SnarkProof } from '@unirep/crypto'
import UnirepCircuit, { CircuitName } from '@unirep/circuits'

import { UnirepTypes } from './contracts/IUnirep'
import { UnirepABI } from './abis/Unirep'
import { rmFuncSigHash } from './utils'

export class SignUpProof implements UnirepTypes.SignUpProofStruct {
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public userHasSignedUp: BigNumberish
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
        this.epoch = _publicSignals[0]
        this.epochKey = _publicSignals[1]
        this.globalStateTree = _publicSignals[2]
        this.attesterId = _publicSignals[3]
        this.userHasSignedUp = _publicSignals[4]
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
            CircuitName.proveUserSignUp,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new utils.Interface(UnirepABI)
        const abiEncoder = iface.encodeFunctionData('hashSignUpProof', [this])
        return utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}
