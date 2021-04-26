import { BigNumber } from 'ethers';
import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IEpochTreeLeaf {
  epochKey: string;
  hashchainResult: string;
}
  
export interface IEpochTreeLeaves extends Document {
  epoch: number
  epochTreeLeaves: Array<IEpochTreeLeaf>
}

const EpochGSTLeavesSchema: Schema = new Schema({
    epoch: { type: Number },
    epochTreeLeaves: { type: Array },
}, { collection: 'EpochTreeLeaves' })

export default mongoose.model<IEpochTreeLeaves>('EpochGSTLeaves', EpochGSTLeavesSchema);