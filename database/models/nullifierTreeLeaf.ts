import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
  
export interface INullifierTreeLeaves extends Document {
  epoch: number
  nullifier: string
  transactionHash: string
}

const NullifiertreeLeavesSchema: Schema = new Schema({
    epoch: { type: Number },
    nullifier: { type: String },
    transactionHash: { type: String },
}, { collection: 'NullifierTreeLeaves' })

export default mongoose.model<INullifierTreeLeaves>('NullifierTreeLeaves', NullifiertreeLeavesSchema);