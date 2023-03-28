import { Circuit, Prover } from './circuits'
import { F, OMT_R, R_X, genEpochTreeLeaf, SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { BigNumberish } from '@ethersproject/bignumber'
import { CircuitConfig } from './CircuitConfig'

const { FIELD_COUNT, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY } =
    CircuitConfig.default

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
        preimages: any[],
        arity = EPOCH_TREE_ARITY,
        depth = EPOCH_TREE_DEPTH,
        fieldCount = FIELD_COUNT
    ) {
        const Rx = R_X(OMT_R, arity ** depth)
        const preimageByLeaf = {} as { [key: string]: bigint[] }
        const startPreimage = Array(fieldCount + 1).fill(0)
        const endPreimage = [1, ...Array(fieldCount).fill(0)]
        const leaves = [startPreimage, ...preimages, endPreimage].map((i) => {
            if (i[0] === 0) {
                preimageByLeaf['0'] = i
                return BigInt(0)
            } else if (i[0] === 1) {
                preimageByLeaf[(F - BigInt(1)).toString()] = i
                return F - BigInt(1)
            }
            const leaf = genEpochTreeLeaf(i[0], i.slice(1))
            preimageByLeaf[leaf.toString()] = [...i]
            return leaf
        }) as bigint[]
        const sortedLeaves = [...leaves].sort((a: bigint, b: bigint) =>
            a > b ? 1 : -1
        )
        const sortedPreimages = sortedLeaves.map(
            (leaf) => preimageByLeaf[leaf.toString()]
        )
        const rVals = sortedLeaves.map((leaf) => Rx[leaves.indexOf(leaf)])

        const finalPreimages = [
            ...sortedPreimages,
            ...Array(Math.max(arity ** depth - sortedPreimages.length, 0))
                .fill(null)
                .map(() => Array(fieldCount + 1).fill(0)),
        ]
        const finalRVals = [
            ...rVals,
            ...Array(Math.max(arity ** depth - sortedPreimages.length, 0))
                .fill(null)
                .map((_, i) => Rx[sortedPreimages.length + i]),
        ]

        return {
            circuitInputs: {
                sorted_leaf_preimages: finalPreimages,
                leaf_r_values: finalRVals,
            },
            leaves,
            sortedLeaves,
        }
    }
}
