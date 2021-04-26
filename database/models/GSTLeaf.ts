import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IGSTLeaf {
    transactionHash: string
    hashedLeaf: string
}
  
export interface IGSTLeaves extends Document {
  epoch: number
  GSTLeaves: Array<IGSTLeaf>
  currentEpochGSTLeafIndexToInsert: number
}

const GSTLeavesSchema: Schema = new Schema({
    epoch: { type: Number },
    GSTLeaves: { type: Array },
    currentEpochGSTLeafIndexToInsert: { type: Number },
}, { collection: 'GSTLeaves' })

export default mongoose.model<IGSTLeaves>('GSTLeaves', GSTLeavesSchema);