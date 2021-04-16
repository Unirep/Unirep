import { BigNumber } from 'ethers';
import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface INewGSTLeaf extends Document {
    transactionHash: string
    formBlockhash: string
    epoch: BigNumber
    hashedLeaf: BigNumber
  }
  
  const NewGSTLeafSchema: Schema = new Schema({
    transactionHash: { type: String },
    formBlockhash: { type: String },
    epoch: { type: String },
    hashedLeaf: { type: String }
  }, { collection: 'NewGSTLeaves' });
  
  export default mongoose.model<INewGSTLeaf>('NewGSTLeaf', NewGSTLeafSchema);