import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IAttestation extends Document {
    epoch: number
    epochKey: string
    attester: string
    attesterId: number
    posRep: number
    negRep: number
    graffiti: string
    overwriteGraffiti: boolean
  }
  
  const AttestationSchema: Schema = new Schema({
    epoch: { type: Number },
    epochKey: { type: String, required: true },
    attester: { type: String, required: true },
    attesterId: { type: Number, required: true },
    posRep: { type: Number },
    negRep: { type: Number },
    graffiti: { type: {} },
    overwriteGraffiti: { type: String },
  }, { collection: 'Attestations' });
  
  export default mongoose.model<IAttestation>('Attestation', AttestationSchema);