import { hash5 } from "@unirep/crypto"
import { BigNumber, BigNumberish } from "ethers"

export interface IAttestation {
    attesterId: BigNumber
    posRep: BigNumber
    negRep: BigNumber
    graffiti: BigNumber
    signUp: BigNumber
    hash(): BigInt
}

export class Attestation implements IAttestation {
    public attesterId: BigNumber
    public posRep: BigNumber
    public negRep: BigNumber
    public graffiti: BigNumber
    public signUp: BigNumber

    constructor(
        _attesterId: BigInt | BigNumberish,
        _posRep: BigInt | BigNumberish,
        _negRep: BigInt | BigNumberish,
        _graffiti: BigInt | BigNumberish,
        _signUp: BigInt | BigNumberish
    ) {
        this.attesterId = BigNumber.from(_attesterId)
        this.posRep = BigNumber.from(_posRep)
        this.negRep = BigNumber.from(_negRep)
        this.graffiti = BigNumber.from(_graffiti)
        this.signUp = BigNumber.from(_signUp)
    }

    public hash = (): BigInt => {
        return hash5([
            this.attesterId.toBigInt(),
            this.posRep.toBigInt(),
            this.negRep.toBigInt(),
            this.graffiti.toBigInt(),
            this.signUp.toBigInt(),
        ])
    }
}