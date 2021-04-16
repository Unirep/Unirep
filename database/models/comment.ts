import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IComment extends Document {
    transactionHash: string
    content: string
    hashedContent: string
    epochKey: string
    epkProof: string
    proveMinRep: boolean
    minRep: number
    status: number // 0: pending, 1: on-chain, 2: disabled
  }
  
  const CommentSchema: Schema = new Schema({
    transactionHash: { type: String },
    content: { type: String },
    hashedContent: {type: String},
    epochKey: { type: String, required: true },
    epkProof: { type: String, required: true },
    proveMinRep: { type: Boolean },
    minRep: { type: Number },
    status: { type: Number, required: true },
  });
  
  export default mongoose.model<IComment>('Comment', CommentSchema);