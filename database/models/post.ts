import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import Comment, { IComment } from './comment';

export interface IPost extends Document {
    transactionHash: string
    content: string
    hashedContent: string
    epochKey: string
    epkProof: string
    proveMinRep: boolean
    minRep: number
    comments: [ IComment ]
    status: number // 0: pending, 1: on-chain, 2: disabled
  }
  
  const PostSchema: Schema = new Schema({
    transactionHash: { type: String },
    content: { type: String },
    hashedContent: {type: String },
    epochKey: { type: String, required: true },
    epkProof: { type: String, required: true },
    proveMinRep: { type: Boolean },
    minRep: { type: Number },
    comments: { type: [ ]},
    status: { type: Number, required: true },
  });
  
  export default mongoose.model<IPost>('Post', PostSchema);