import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IPost extends Document {
    content: string
    epochKey: string
    epkProof: string
  }
  
  const PostSchema: Schema = new Schema({
    content: { type: String },
    epochKey: { type: String, required: true },
    epkProof: { type: String, required: true }
  });
  
  export default mongoose.model<IPost>('Post', PostSchema);