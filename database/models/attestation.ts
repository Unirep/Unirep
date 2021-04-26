import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IAttestation {
  transactionHash: string;
  epoch: number
  attester: string
  attesterId: string
  posRep: string
  negRep: string
  graffiti: string
  overwriteGraffiti: boolean
}

export interface IAttestations extends Document {
  epochKey: string
  attestations: Array<IAttestation>
}
  
const AttestationsSchema: Schema = new Schema({
  epochKey: { type: String },
  attestations: { type: Array },
}, { collection: 'Attestations' });


export default mongoose.model<IAttestations>('Attestations', AttestationsSchema);