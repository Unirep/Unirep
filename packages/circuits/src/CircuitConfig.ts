import { SNARK_SCALAR_FIELD } from '@unirep/utils'

const defaultConfig = {
    STATE_TREE_DEPTH: 12,
    EPOCH_TREE_DEPTH: 4,
    EPOCH_TREE_ARITY: 3,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: 3,
    FIELD_COUNT: 6, // total number of fields
    SUM_FIELD_COUNT: 4, // number of fields combined using addition
    HISTORY_TREE_DEPTH: 20,
}

export class CircuitConfig {
    STATE_TREE_DEPTH: number
    EPOCH_TREE_DEPTH: number
    EPOCH_TREE_ARITY: number
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: number
    FIELD_COUNT: number
    SUM_FIELD_COUNT: number
    SNARK_SCALAR_FIELD: string
    HISTORY_TREE_DEPTH: number

    static get default() {
        return new CircuitConfig(defaultConfig)
    }

    constructor(config: {
        STATE_TREE_DEPTH: number
        EPOCH_TREE_DEPTH: number
        EPOCH_TREE_ARITY: number
        NUM_EPOCH_KEY_NONCE_PER_EPOCH: number
        FIELD_COUNT: number
        SUM_FIELD_COUNT: number
        HISTORY_TREE_DEPTH: number
    }) {
        this.STATE_TREE_DEPTH = config.STATE_TREE_DEPTH
        this.EPOCH_TREE_DEPTH = config.EPOCH_TREE_DEPTH
        this.EPOCH_TREE_ARITY = config.EPOCH_TREE_ARITY
        this.NUM_EPOCH_KEY_NONCE_PER_EPOCH =
            config.NUM_EPOCH_KEY_NONCE_PER_EPOCH
        this.FIELD_COUNT = config.FIELD_COUNT
        this.SUM_FIELD_COUNT = config.SUM_FIELD_COUNT
        this.SNARK_SCALAR_FIELD = SNARK_SCALAR_FIELD
        this.HISTORY_TREE_DEPTH = config.HISTORY_TREE_DEPTH
    }
}

export default new CircuitConfig(defaultConfig)
