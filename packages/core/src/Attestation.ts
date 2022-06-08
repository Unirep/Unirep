import { UnirepTypes } from "@unirep/contracts";
import { hash5 } from "@unirep/crypto";
import { BigNumberish } from "ethers";

export class Attestation implements UnirepTypes.AttestationStruct {
    attesterId: BigNumberish;
    posRep: BigNumberish;
    negRep: BigNumberish;
    graffiti: BigNumberish;
    signUp: BigNumberish;

    constructor(
        attestation: UnirepTypes.AttestationStruct
    ) {
        this.attesterId = attestation.attesterId,
        this.posRep = attestation.posRep,
        this.negRep = attestation.negRep,
        this.graffiti = attestation.graffiti,
        this.signUp = attestation.signUp,
    }

    hash() {
        return hash5([
            BigInt(this.attesterId.toString()),
            BigInt(this.posRep.toString()),
            BigInt(this.negRep.toString()),
            BigInt(this.graffiti.toString()),
            BigInt(this.signUp.toString()),
        ])
    }
}