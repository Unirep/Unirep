import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IComment extends Document {
    content: string
  }
  
  const CommentSchema: Schema = new Schema({
    content: { type: String }
  });
  
  export default mongoose.model<IComment>('Comment', CommentSchema);