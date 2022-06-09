import assert from 'assert'
import { BigNumber, BigNumberish } from 'ethers'
import { hash5, hashOne } from './utils'

import { IReputation } from './interfaces'

export default class Reputation implements IReputation {
    public posRep: BigNumber
    public negRep: BigNumber
    public graffiti: BigNumber
    public graffitiPreImage: BigNumber = BigNumber.from(0)
    public signUp: BigNumber

    constructor(
        _posRep: BigInt | BigNumberish,
        _negRep: BigInt | BigNumberish,
        _graffiti: BigInt | BigNumberish,
        _signUp: BigInt | BigNumberish
    ) {
        this.posRep = BigNumber.from(_posRep)
        this.negRep = BigNumber.from(_negRep)
        this.graffiti = BigNumber.from(_graffiti)
        this.signUp = BigNumber.from(_signUp)
    }

    public static default(): Reputation {
        return new Reputation(
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0)
        )
    }

    public update = (
        _posRep: BigNumber,
        _negRep: BigNumber,
        _graffiti: BigNumber,
        _signUp: BigNumber
    ): IReputation => {
        this.posRep = this.posRep.add(_posRep)
        this.negRep = this.negRep.add(_negRep)
        if (_graffiti !== BigNumber.from(0)) {
            this.graffiti = _graffiti
        }
        this.signUp = this.signUp.or(_signUp)
        return this
    }

    public addGraffitiPreImage = (_graffitiPreImage: BigNumber) => {
        assert(
            hashOne(_graffitiPreImage.toBigInt()) === this.graffiti.toBigInt(),
            'Graffiti pre-image does not match'
        )
        this.graffitiPreImage = _graffitiPreImage
    }

    public hash = (): BigInt => {
        return hash5([
            this.posRep.toBigInt(),
            this.negRep.toBigInt(),
            this.graffiti.toBigInt(),
            this.signUp.toBigInt(),
            BigInt(0),
        ])
    }

    public toJSON = (): string => {
        return JSON.stringify({
            posRep: this.posRep.toString(),
            negRep: this.negRep.toString(),
            graffiti: this.graffiti.toString(),
            graffitiPreImage: this.graffitiPreImage.toString(),
            signUp: this.signUp.toString(),
        })
    }
}
