import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { ethers } from 'ethers'
import { hashLeftRight } from 'maci-crypto'
import { computeEmptyUserStateRoot } from '../../test/utils'

export interface ISettings extends Document {
    globalStateTreeDepth: number
	userStateTreeDepth: number
	epochTreeDepth: number
	nullifierTreeDepth: number
	attestingFee: ethers.BigNumber
    epochLength: number
	numEpochKeyNoncePerEpoch: number
	numAttestationsPerEpochKey: number
	defaultGSTLeaf: string
}
  
const SettingSchema: Schema = new Schema({
    globalStateTreeDepth: { type: Number },
	userStateTreeDepth:  { type: Number },
	epochTreeDepth:  { type: Number },
	nullifierTreeDepth:  { type: Number },
	attestingFee:  { type: {} },
    epochLength:  { type: Number },
	numEpochKeyNoncePerEpoch:  { type: Number },
	numAttestationsPerEpochKey:  { type: Number },
	defaultGSTLeaf:  { type: String },
}, { collection: 'Settings' });

  
export default mongoose.model<ISettings>('Settings', SettingSchema);