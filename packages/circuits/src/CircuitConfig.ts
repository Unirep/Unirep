import BN from 'bn.js'
import { hash1 } from '@unirep/utils'

export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'

const defaultConfig = {
    STATE_TREE_DEPTH: 12,
    EPOCH_TREE_DEPTH: 4,
    EPOCH_TREE_ARITY: 3,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: 3,
}

export class CircuitConfig {
    STATE_TREE_DEPTH: number
    EPOCH_TREE_DEPTH: number
    EPOCH_TREE_ARITY: number
    NUM_EPOCH_KEY_NONCE_PER_EPOCH: number
    SNARK_SCALAR_FIELD: string
    _N: BN
    Rx: bigint[]
    R: bigint

    static get default() {
        return new CircuitConfig(defaultConfig)
    }

    constructor(config: {
        STATE_TREE_DEPTH: number
        EPOCH_TREE_DEPTH: number
        EPOCH_TREE_ARITY: number
        NUM_EPOCH_KEY_NONCE_PER_EPOCH: number
        R?: string | bigint
    }) {
        const { R } = config
        const _R =
            R ??
            hash1([
                `0x${Buffer.from('unirep_polyhash_constant', 'utf8').toString(
                    'hex'
                )}`,
            ])
        if (typeof _R !== 'string' && typeof _R !== 'bigint') {
            throw new Error('R value must be string or bigint')
        }

        this.STATE_TREE_DEPTH = config.STATE_TREE_DEPTH
        this.EPOCH_TREE_DEPTH = config.EPOCH_TREE_DEPTH
        this.EPOCH_TREE_ARITY = config.EPOCH_TREE_ARITY
        this.NUM_EPOCH_KEY_NONCE_PER_EPOCH =
            config.NUM_EPOCH_KEY_NONCE_PER_EPOCH
        this.SNARK_SCALAR_FIELD = SNARK_SCALAR_FIELD
        this._N = new BN(this.SNARK_SCALAR_FIELD, 10)
        this.R = BigInt(_R)
        this.Rx = this.buildRx()
    }

    // build array of EPOCH_TREE_DEPTH**EPOCH_TREE_ARITY R exponents
    buildRx() {
        const _R = new BN(this.R.toString(), 10)

        let _Rx = new BN(_R)

        const Rx = [] as bigint[]
        Rx.push(BigInt(1))
        for (
            let x = 1;
            x < this.EPOCH_TREE_ARITY ** this.EPOCH_TREE_DEPTH;
            x++
        ) {
            Rx.push(BigInt(_Rx.toString(10)))
            _Rx = _Rx.mul(_R).mod(this._N)
        }
        return Rx
    }
}

export default new CircuitConfig(defaultConfig)
