import config from '../dist/config/index.js'
// TODO: better command line build options
import { EPK_R, OMT_R } from '@unirep/utils'
const {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    SUM_FIELD_COUNT,
} = config.default

export const ptauName = 'powersOfTau28_hez_final_18.ptau'

export const circuitContents = {
    userStateTransition: `pragma circom 2.0.0; include "../circuits/userStateTransition.circom"; \n\ncomponent main { public [ from_epoch, to_epoch, attester_id ] } = UserStateTransition(${STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${EPOCH_TREE_ARITY}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${EPK_R}, ${FIELD_COUNT}, ${SUM_FIELD_COUNT});`,
    epochKey: `pragma circom 2.0.0; include "../circuits/epochKey.circom"; \n\ncomponent main { public [ sig_data ] } = EpochKey(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${FIELD_COUNT}, ${EPK_R});`,
    proveReputation: `pragma circom 2.0.0; include "../circuits/proveReputation.circom"; \n\ncomponent main { public [ graffiti_pre_image, sig_data ] } = ProveReputation(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${SUM_FIELD_COUNT}, ${FIELD_COUNT}, ${EPK_R});`,
    epochKeyLite: `pragma circom 2.0.0; include "../circuits/epochKeyLite.circom"; \n\ncomponent main { public [ sig_data ] } = EpochKeyLite(${NUM_EPOCH_KEY_NONCE_PER_EPOCH});`,
    signup: `pragma circom 2.0.0; include "../circuits/signup.circom"; \n\ncomponent main { public [ attester_id, epoch ] } = Signup(${FIELD_COUNT}, ${EPK_R});`,
    buildOrderedTree: `pragma circom 2.0.0; include "../circuits/buildOrderedTree.circom"; \n\ncomponent main = BuildOrderedTree(${EPOCH_TREE_DEPTH}, ${EPOCH_TREE_ARITY}, ${FIELD_COUNT}, ${OMT_R}, ${EPK_R});`,
    // test circuits
    bigComparators: `pragma circom 2.0.0; include "../circuits/bigComparators.circom"; \n\ncomponent main = BigLessThan();`,
}
