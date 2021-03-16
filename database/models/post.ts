import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import Comment, { IComment } from './comment';

export interface IPost extends Document {
    content: string
    epochKey: string
    epkProof: string
    comments: [ IComment ]
  }
  
  const PostSchema: Schema = new Schema({
    content: { type: String },
    epochKey: { type: String, required: true },
    epkProof: { type: String, required: true },
    comments: { type: [ ]}
  });
  
  export default mongoose.model<IPost>('Post', PostSchema);