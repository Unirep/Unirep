import {
    EPOCH_BITS,
    NONCE_BITS,
    ATTESTER_ID_BITS,
    CHAIN_ID_BITS,
    REVEAL_NONCE_BITS,
    SNARK_SCALAR_FIELD,
    REP_BITS,
    ONE_BIT,
} from '@unirep/utils'

const defaultConfig = {
    STATE_TREE_DEPTH: 17,
    EPOCH_TREE_DEPTH: 17,
    HISTORY_TREE_DEPTH: 17,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: 3,
    FIELD_COUNT: 6, // total number of fields
    SUM_FIELD_COUNT: 4, // number of fields combined using addition
    REPL_NONCE_BITS: 48,
}

export class CircuitConfig {
    STATE_TREE_DEPTH: number
    EPOCH_TREE_DEPTH: number
    HISTORY_TREE_DEPTH: number
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: number
    FIELD_COUNT: number
    SUM_FIELD_COUNT: number
    REPL_NONCE_BITS: number

    SNARK_SCALAR_FIELD: string

    static get default() {
        return new CircuitConfig(defaultConfig)
    }

    get contractConfig() {
        return {
            stateTreeDepth: this.STATE_TREE_DEPTH,
            epochTreeDepth: this.EPOCH_TREE_DEPTH,
            historyTreeDepth: this.HISTORY_TREE_DEPTH,
            numEpochKeyNoncePerEpoch: this.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            fieldCount: this.FIELD_COUNT,
            sumFieldCount: this.SUM_FIELD_COUNT,
            replNonceBits: this.REPL_NONCE_BITS,
            replFieldBits: this.REPL_FIELD_BITS,
        }
    }

    get REPL_FIELD_BITS() {
        return 253 - this.REPL_NONCE_BITS
    }

    static get EPOCH_BITS() {
        return EPOCH_BITS
    }
    static get NONCE_BITS() {
        return NONCE_BITS
    }
    static get ATTESTER_ID_BITS() {
        return ATTESTER_ID_BITS
    }

    static get CHAIN_ID_BITS() {
        return CHAIN_ID_BITS
    }

    static get REVEAL_NONCE_BITS() {
        return REVEAL_NONCE_BITS
    }

    static get REP_BITS() {
        return REP_BITS
    }

    static get ONE_BIT() {
        return ONE_BIT
    }

    constructor(
        _config: {
            STATE_TREE_DEPTH?: number
            EPOCH_TREE_DEPTH?: number
            HISTORY_TREE_DEPTH?: number
            NUM_EPOCH_KEY_NONCE_PER_EPOCH?: number
            FIELD_COUNT?: number
            SUM_FIELD_COUNT?: number
            REPL_NONCE_BITS?: number
        } = {}
    ) {
        const config = { ...defaultConfig, ..._config }
        this.STATE_TREE_DEPTH = config.STATE_TREE_DEPTH
        this.EPOCH_TREE_DEPTH = config.EPOCH_TREE_DEPTH
        this.HISTORY_TREE_DEPTH = config.HISTORY_TREE_DEPTH
        this.NUM_EPOCH_KEY_NONCE_PER_EPOCH =
            config.NUM_EPOCH_KEY_NONCE_PER_EPOCH
        this.FIELD_COUNT = config.FIELD_COUNT
        this.SUM_FIELD_COUNT = config.SUM_FIELD_COUNT
        this.REPL_NONCE_BITS = config.REPL_NONCE_BITS
        this.SNARK_SCALAR_FIELD = SNARK_SCALAR_FIELD
    }
}

export default new CircuitConfig(defaultConfig)
