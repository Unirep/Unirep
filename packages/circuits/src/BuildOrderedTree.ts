import { Circuit, Prover } from './circuits'
import { SnarkProof, hash5 } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { BigNumberish } from '@ethersproject/bignumber'
import {
    EPOCH_TREE_ARITY,
    EPOCH_TREE_DEPTH,
    SNARK_SCALAR_FIELD,
    Rx,
} from '../config'

export class BuildOrderedTree extends BaseProof {
    readonly idx = {
        root: 0,
        checksum: 1,
    }
    public root: BigNumberish
    public checksum: BigNumberish

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.root = _publicSignals[this.idx.root].toString()
        this.checksum = _publicSignals[this.idx.checksum].toString()
        this.circuit = Circuit.buildOrderedTree
    }

    static buildInputsForLeaves(
        leaves: any[],
        arity = EPOCH_TREE_ARITY,
        depth = EPOCH_TREE_DEPTH
    ) {
        const sortedLeaves = [...leaves].sort((a, b) => {
            const leafA = hash5(a)
            const leafB = hash5(b)
            return leafA > leafB ? 1 : -1
        })
        sortedLeaves.unshift([0, 0, 0, 0, 0])
        sortedLeaves.push([1, 0, 0, 0, 0])
        const rVals = sortedLeaves.map((l, i) => {
            if (l[0] === 0) {
                return Rx[0]
            } else if (l[0] === 1) {
                return Rx[leaves.length + 1]
            }
            return Rx[1 + leaves.indexOf(l)]
        })

        const leafCount = sortedLeaves.length
        const targetLength = arity ** depth
        for (let x = 0; x < targetLength - leafCount; x++) {
            sortedLeaves.push([0, 0, 0, 0, 0])
            rVals.push(Rx[leafCount + x])
        }
        return {
            circuitInputs: {
                sorted_leaf_preimages: sortedLeaves,
                leaf_r_values: rVals,
            },
            // the unordered leaf pre-images, including the padding leaves
            leaves: [[0, 0, 0, 0, 0], ...leaves, [1, 0, 0, 0, 0]].map((l) => {
                if (l[0] === 0) {
                    return BigInt(0)
                } else if (l[0] === 1) {
                    return BigInt(SNARK_SCALAR_FIELD) - BigInt(1)
                }
                return hash5(l)
            }),
            sortedLeaves: sortedLeaves.map((l) => {
                if (l[0] === 0) {
                    return BigInt(0)
                } else if (l[0] === 1) {
                    return BigInt(SNARK_SCALAR_FIELD) - BigInt(1)
                }
                return hash5(l)
            }),
        }
    }
}
