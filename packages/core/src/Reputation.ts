import assert from 'assert'
import { BigNumber, BigNumberish } from 'ethers'
import { hash5, hashOne } from '@unirep/crypto'

import { IReputation } from './interfaces'

/**
 * Reputation object in Unirep Protocol. It includes `posRep` (positive reputation),
 * `negRep` (negative reputation), `graffiti` (graffiti is used to make reputation more flexible),
 * `signUp` (whether the attester authenticates the user has signed up in the attester's application).
 */
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

    /**
     * The default Reputation object.
     * @returns The reputation is constructed by 0 `posRep`, 0 `negRep`, 0 `graffiti`, 0 `signUp`
     */
    public static default(): Reputation {
        return new Reputation(
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0)
        )
    }

    /**
     * Update the reputation object by adding new `posRep`, `negRep`, `graffiti` and `signUp`.
     * Both `posRep` and `negRep` will be added to the old `posRep` and `negRep`.
     * The `graffiti` will be overwritten if it is not zero.
     * The `signUp` flag will be set `1` if any of the reputation is non-zero.
     * @param _posRep The new positive reputation which should be added
     * @param _negRep The new negative reputation which should be added
     * @param _graffiti The graffiti which should be overwritten
     * @param _signUp The sign up flag which should be updated
     * @returns The updated reputation object
     */
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

    /**
     * User should store the graffiti pre-image before proving graffities
     * @param _graffitiPreImage The graffiti pre-imgae of the current graffiti
     */
    public addGraffitiPreImage = (_graffitiPreImage: BigNumber) => {
        assert(
            hashOne(_graffitiPreImage.toBigInt()) ===
                BigInt(this.graffiti.toString()),
            'Graffiti pre-image does not match'
        )
        this.graffitiPreImage = _graffitiPreImage
    }

    /**
     * Compute the hash of the reputation object
     * @returns hash value of `posRep`, `negRep`, `graffiti` and `signUp`
     */
    public hash = (): BigInt => {
        return hash5([
            BigInt(this.posRep.toString()),
            BigInt(this.negRep.toString()),
            BigInt(this.graffiti.toString()),
            BigInt(this.signUp.toString()),
            BigInt(0),
        ])
    }

    /**
     * Stringify the reputation object
     */
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
