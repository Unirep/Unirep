import config from '../dist/src/CircuitConfig.js'
// TODO: better command line build options
const {
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    HISTORY_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    SUM_FIELD_COUNT,
    REPL_NONCE_BITS,
} = config.default

export const ptauName = 'powersOfTau28_hez_final_18.ptau'

export const circuitContents = {
    userStateTransition: `pragma circom 2.0.0; include "../circuits/userStateTransition.circom"; \n\ncomponent main { public [ to_epoch, attester_id ] } = UserStateTransition(${STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${HISTORY_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${FIELD_COUNT}, ${SUM_FIELD_COUNT}, ${REPL_NONCE_BITS});`,
    epochKey: `pragma circom 2.0.0; include "../circuits/epochKey.circom"; \n\ncomponent main { public [ sig_data ] } = EpochKey(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${FIELD_COUNT});`,
    proveReputation: `pragma circom 2.0.0; include "../circuits/proveReputation.circom"; \n\ncomponent main { public [ graffiti, sig_data ] } = ProveReputation(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${SUM_FIELD_COUNT}, ${FIELD_COUNT}, ${REPL_NONCE_BITS});`,
    epochKeyLite: `pragma circom 2.0.0; include "../circuits/epochKeyLite.circom"; \n\ncomponent main { public [ sig_data ] } = EpochKeyLite(${NUM_EPOCH_KEY_NONCE_PER_EPOCH});`,
    signup: `pragma circom 2.0.0; include "../circuits/signup.circom"; \n\ncomponent main { public [ attester_id, epoch ] } = Signup(${FIELD_COUNT});`,
    // test circuits
    incrementalMerkleTree: `pragma circom 2.0.0; include "../circuits/incrementalMerkleTree.circom"; \n\ncomponent main = MerkleTreeInclusionProof(${STATE_TREE_DEPTH});`,
    bigComparators: `pragma circom 2.0.0; include "../circuits/bigComparators.circom"; \n\ncomponent main = BigLessThan();`,
    upperComparators: `pragma circom 2.0.0; include "../circuits/bigComparators.circom"; \n\ncomponent main = UpperLessThan(64);`,
    preventDoubleAction: `pragma circom 2.0.0; include "../circuits/preventDoubleAction.circom"; \n\ncomponent main { public [ sig_data ] } = PreventDoubleAction(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${FIELD_COUNT});`,
}
