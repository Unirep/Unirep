import { BigNumber } from 'ethers';
import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IUserTransitionedState extends Document {
    transactionHash: string
    toEpoch: number
    fromEpoch: number
    newGlobalStateTreeLeaf: BigNumber
    fromGlobalStateTree: BigNumber
    fromEpochTree: BigNumber
    fromNullifierTreeRoot: BigNumber
    proof: [ string ]
    attestationNullifiers:  [ string ]
    epkNullifiers:  [ string ]
  }
  
  const UserTransitionedStateSchema: Schema = new Schema({
    transactionHash: { type: String },
    toEpoch: { type: Number, required: true },
    fromEpoch: { type: Number, required: true },
    newGlobalStateTreeLeaf: { type: {}, required: true },
    fromGlobalStateTree: { type: {}, required: true },
    fromEpochTree: { type: {}, required: true},
    fromNullifierTreeRoot: { type: {}, required: true },
    proof: { type: [] },
    attestationNullifiers: { type: [] },
    epkNullifiers: { type: [] },
  }, { collection: 'UserTransitionedStates' });
  
  export default mongoose.model<IUserTransitionedState>('UserTransitionedState', UserTransitionedStateSchema);