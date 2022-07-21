import { hash5 } from '@unirep/crypto'
import { BigNumber, BigNumberish } from 'ethers'

/**
 * The interface of Attestation defined in unirep protocol
 */
export interface IAttestation {
    attesterId: BigNumber
    posRep: BigNumber
    negRep: BigNumber
    graffiti: BigNumber
    signUp: BigNumber
    hash(): BigInt
}

/**
 * The Attestation object of unirep protocol
 */
export class Attestation implements IAttestation {
    public attesterId: BigNumber
    public posRep: BigNumber
    public negRep: BigNumber
    public graffiti: BigNumber
    public signUp: BigNumber

    /**
     * @param _attesterId The ID of the attester
     * @param _posRep The positive reputation that the attester wants to give
     * @param _negRep The negative reputation that the attester wants to give
     * @param _graffiti The graffiti that the attester wants to give
     * @param _signUp The sign up flag that the attester wants to give
     */
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

    /**
     * Hash the attestation to compute the hash chain of an epoch key
     * @returns Hash value of all attestation data
     */
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
