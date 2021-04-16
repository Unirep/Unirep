import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IReputationNullifier extends Document {
    // on-chain transaction hash
    transactionHash: string
    // upvote, downvote, post, comment
    action: string
    // spend nullifiers
    nullifiers: string
  }
  
  const ReputationNullifierSchema: Schema = new Schema({
    transactionHash: { type: String },
    action: { type: String, enum: ['UpVote', 'DownVote', 'Post', 'Comment'] },
    nullifiers: { type: String },
  }, { collection: 'ReputationNullifier' });
  
  export default mongoose.model<IReputationNullifier>('ReputationNullifier', ReputationNullifierSchema);