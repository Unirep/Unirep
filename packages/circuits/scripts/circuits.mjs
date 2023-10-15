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
    userStateTransition: `pragma circom 2.0.0; include "../circuits/userStateTransition.circom"; \n\ncomponent main = UserStateTransition(${STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${HISTORY_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${FIELD_COUNT}, ${SUM_FIELD_COUNT}, ${REPL_NONCE_BITS});`,
    epochKey: `pragma circom 2.0.0; include "../circuits/epochKey.circom"; \n\ncomponent main { public [ sig_data ] } = EpochKey(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${FIELD_COUNT});`,
    reputation: `pragma circom 2.0.0; include "../circuits/reputation.circom"; \n\ncomponent main { public [ graffiti, sig_data ] } = Reputation(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${SUM_FIELD_COUNT}, ${FIELD_COUNT}, ${REPL_NONCE_BITS});`,
    epochKeyLite: `pragma circom 2.0.0; include "../circuits/epochKeyLite.circom"; \n\ncomponent main { public [ sig_data ] } = EpochKeyLite(${NUM_EPOCH_KEY_NONCE_PER_EPOCH});`,
    signup: `pragma circom 2.0.0; include "../circuits/signup.circom"; \n\ncomponent main = Signup(${FIELD_COUNT});`,
    spendReputation: `pragma circom 2.0.0; include "../circuits/spendReputation.circom"; \n\ncomponent main = SpendReputation(${STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${SUM_FIELD_COUNT}, ${FIELD_COUNT});`,
    // test circuits
    incrementalMerkleTree: `pragma circom 2.0.0; include "../circuits/incrementalMerkleTree.circom"; \n\ncomponent main = MerkleTreeInclusionProof(${STATE_TREE_DEPTH});`,
    lowerComparators: `pragma circom 2.0.0; include "../circuits/bigComparators.circom"; \n\ncomponent main = LowerLessThan(${REPL_NONCE_BITS});`,
    scopeNullifier: `pragma circom 2.0.0; include "../circuits/scopeNullifier.circom"; \n\ncomponent main { public [ sig_data, scope ] } = ScopeNullifier(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${FIELD_COUNT});`,
}
