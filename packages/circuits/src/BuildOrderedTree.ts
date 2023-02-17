import { Circuit, Prover } from './circuits'
import { SnarkProof, hash5, stringifyBigInts } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { BigNumberish } from '@ethersproject/bignumber'
import defaultConfig from '../config'

const { EPOCH_TREE_ARITY, EPOCH_TREE_DEPTH, SNARK_SCALAR_FIELD, Rx } =
    defaultConfig as any

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
        const firstLeafPreImage = [0, 0, 0, 0, 0]
        const lastLeafPreImage = [1, 0, 0, 0, 0]
        const smallestLeafValue = BigInt(0)
        const largestLeafValue = BigInt(SNARK_SCALAR_FIELD) - BigInt(1)
        const isArrayEqual = (array1, array2) => {
            return (
                JSON.stringify(stringifyBigInts(array1)) ===
                JSON.stringify(stringifyBigInts(array2))
            )
        }

        sortedLeaves.unshift(firstLeafPreImage)
        sortedLeaves.push(lastLeafPreImage)
        const rVals = sortedLeaves.map((l) => {
            if (isArrayEqual(l, firstLeafPreImage)) {
                return Rx[0]
            } else if (isArrayEqual(l, lastLeafPreImage)) {
                return Rx[leaves.length + 1]
            }
            return Rx[1 + leaves.indexOf(l)]
        })

        const leafCount = sortedLeaves.length
        const targetLength = arity ** depth
        for (let x = 0; x < targetLength - leafCount; x++) {
            sortedLeaves.push(firstLeafPreImage)
            rVals.push(Rx[leafCount + x])
        }
        return {
            circuitInputs: {
                sorted_leaf_preimages: sortedLeaves,
                leaf_r_values: rVals,
            },
            // the unordered leaf pre-images, including the padding leaves
            leaves: [firstLeafPreImage, ...leaves, lastLeafPreImage].map(
                (l) => {
                    if (isArrayEqual(l, firstLeafPreImage)) {
                        return smallestLeafValue
                    } else if (isArrayEqual(l, lastLeafPreImage)) {
                        return largestLeafValue
                    }
                    return hash5(l)
                }
            ),
            sortedLeaves: sortedLeaves.map((l) => {
                if (isArrayEqual(l, firstLeafPreImage)) {
                    return smallestLeafValue
                } else if (isArrayEqual(l, lastLeafPreImage)) {
                    return largestLeafValue
                }
                return hash5(l)
            }),
        }
    }
}
