import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

  
export interface IUserSignUp extends Document {
    transactionHash: string
    hashedLeaf: string
    epoch: number
}

const UserSignUpSchema: Schema = new Schema({
    transactionHash: { type: String },
    hashedLeaf: { type: String },
    epoch: { type: Number },
}, { collection: 'Users' })

export default mongoose.model<IUserSignUp>('UserSignUp', UserSignUpSchema);