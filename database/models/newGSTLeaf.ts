import { BigNumber } from 'ethers';
import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface INewGSTLeaf extends Document {
    formBlockhash: string
    epoch: BigNumber
    hashedLeaf: BigNumber
  }
  
  const NewGSTLeafSchema: Schema = new Schema({
    formBlockhash: { type: String },
    epoch: { type: String },
    hashedLeaf: { type: String }
  }, { collection: 'NewGSTLeaves' });
  
  export default mongoose.model<INewGSTLeaf>('NewGSTLeaf', NewGSTLeafSchema);