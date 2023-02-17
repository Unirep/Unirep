import BN from 'bn.js'
import { SNARK_SCALAR_FIELD, hash1 } from '@unirep/utils'

const defaultConfig = {
    STATE_TREE_DEPTH: 12,
    EPOCH_TREE_DEPTH: 4,
    EPOCH_TREE_ARITY: 3,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: 3,
    FIELD_COUNT: 4, // total number of fields
    SUM_FIELD_COUNT: 2, // number of fields combined using addition
}

export class CircuitConfig {
    STATE_TREE_DEPTH: number
    EPOCH_TREE_DEPTH: number
    EPOCH_TREE_ARITY: number
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: number
    FIELD_COUNT: number
    SUM_FIELD_COUNT: number
    SNARK_SCALAR_FIELD: string
    _N: BN

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
    }) {
        this.STATE_TREE_DEPTH = config.STATE_TREE_DEPTH
        this.EPOCH_TREE_DEPTH = config.EPOCH_TREE_DEPTH
        this.EPOCH_TREE_ARITY = config.EPOCH_TREE_ARITY
        this.NUM_EPOCH_KEY_NONCE_PER_EPOCH =
            config.NUM_EPOCH_KEY_NONCE_PER_EPOCH
        this.FIELD_COUNT = config.FIELD_COUNT
        this.SUM_FIELD_COUNT = config.SUM_FIELD_COUNT
        this.SNARK_SCALAR_FIELD = SNARK_SCALAR_FIELD
        this._N = new BN(this.SNARK_SCALAR_FIELD, 10)
        // this.Rx = this.buildRx()
    }

    // build array of EPOCH_TREE_DEPTH**EPOCH_TREE_ARITY R exponents
    // buildRx() {
    //     const _R = new BN(this.R.toString(), 10)
    //
    //     let _Rx = new BN(_R)
    //
    //     const Rx = [] as bigint[]
    //     Rx.push(BigInt(1))
    //     for (
    //         let x = 1;
    //         x < this.EPOCH_TREE_ARITY ** this.EPOCH_TREE_DEPTH;
    //         x++
    //     ) {
    //         Rx.push(BigInt(_Rx.toString(10)))
    //         _Rx = _Rx.mul(_R).mod(this._N)
    //     }
    //     return Rx
    // }
}

export default new CircuitConfig(defaultConfig)
