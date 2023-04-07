import { Identity } from '@semaphore-protocol/identity'
import * as utils from '@unirep/utils'

import { Circuit, SNARK_SCALAR_FIELD, CircuitConfig } from '../src'
import { defaultProver } from '../provers/defaultProver'
const {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    SUM_FIELD_COUNT,
    FIELD_COUNT,
} = CircuitConfig.default

export const randomData = () => [
    ...Array(SUM_FIELD_COUNT)
        .fill(0)
        .map(() => utils.hash1([Math.floor(Math.random() * 199191919)])),
    ...Array(FIELD_COUNT - SUM_FIELD_COUNT)
        .fill(0)
        .map((_, i) => {
            if (i % 2 === SUM_FIELD_COUNT % 2) {
                return utils.hash1([Math.floor(Math.random() * 128289928892)])
            } else {
                return BigInt(Math.floor(Math.random() * 2 ** 10))
            }
        }),
]

export const combineData = (data0, data1) => {
    const out = [] as bigint[]
    for (let x = 0; x < SUM_FIELD_COUNT; x++) {
        out.push(
            (BigInt(data0[x]) + BigInt(data1[x])) % BigInt(SNARK_SCALAR_FIELD)
        )
    }
    for (let x = SUM_FIELD_COUNT; x < FIELD_COUNT; x += 2) {
        if (BigInt(data0[x + 1]) > BigInt(data1[x + 1])) {
            out.push(data0[x])
            out.push(data0[x + 1])
        } else {
            out.push(data1[x])
            out.push(data1[x + 1])
        }
    }
    return out
}

const genEpochKeyCircuitInput = (config: {
    id: Identity
    tree: utils.IncrementalMerkleTree
    leafIndex: number
    epoch: number
    nonce: number
    attesterId: number | bigint
    data?: bigint[]
    sigData?: bigint
    revealNonce?: number
}) => {
    const {
        id,
        tree,
        leafIndex,
        epoch,
        nonce,
        attesterId,
        data: _data,
        sigData,
        revealNonce,
    } = Object.assign(
        {
            data: [],
        },
        config
    )
    const data = [..._data, ...Array(FIELD_COUNT - _data.length).fill(0)]
    const proof = tree.createProof(leafIndex)
    const circuitInputs = {
        state_tree_elements: proof.siblings,
        state_tree_indexes: proof.pathIndices,
        identity_secret: id.secret,
        data,
        sig_data: sigData ?? BigInt(0),
        nonce,
        epoch,
        attester_id: attesterId,
        reveal_nonce: revealNonce ?? 0,
    }
    return utils.stringifyBigInts(circuitInputs)
}

const genReputationCircuitInput = (config: {
    id: Identity
    epoch: number
    nonce: number
    attesterId: number | bigint
    startBalance?: (bigint | number)[]
    minRep?: number | bigint
    maxRep?: number | bigint
    proveMinRep?: number
    proveMaxRep?: number
    proveZeroRep?: number
    proveGraffiti?: boolean | number
    graffitiPreImage?: any
    revealNonce?: number
}) => {
    const {
        id,
        epoch,
        nonce,
        attesterId,
        startBalance: _startBalance,
        minRep,
        proveGraffiti,
        graffitiPreImage,
        maxRep,
        proveMinRep,
        proveMaxRep,
        proveZeroRep,
        revealNonce,
    } = Object.assign(
        {
            minRep: 0,
            maxRep: 0,
            graffitiPreImage: 0,
            startBalance: [],
        },
        config
    )

    const startBalance = [
        ..._startBalance,
        ...Array(FIELD_COUNT - _startBalance.length).fill(0),
    ]
    // Global state tree
    const stateTree = new utils.IncrementalMerkleTree(STATE_TREE_DEPTH)
    const hashedLeaf = utils.genStateTreeLeaf(
        id.secret,
        BigInt(attesterId),
        epoch,
        startBalance as any
    )
    stateTree.insert(hashedLeaf)
    const stateTreeProof = stateTree.createProof(0) // if there is only one GST leaf, the index is 0

    const circuitInputs = {
        identity_secret: id.secret,
        state_tree_indexes: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings,
        data: startBalance,
        graffiti_pre_image: graffitiPreImage,
        epoch,
        nonce,
        attester_id: attesterId,
        prove_graffiti: proveGraffiti ? 1 : 0,
        min_rep: minRep,
        max_rep: maxRep,
        prove_max_rep: proveMaxRep ?? 0,
        prove_min_rep: proveMinRep ?? 0,
        prove_zero_rep: proveZeroRep ?? 0,
        reveal_nonce: revealNonce ?? 0,
        sig_data: 0,
    }
    return utils.stringifyBigInts(circuitInputs)
}

const genProofAndVerify = async (circuit: Circuit, circuitInputs: any) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } =
        await defaultProver.genProofAndPublicSignals(circuit, circuitInputs)
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )
    const isValid = await defaultProver.verifyProof(
        circuit,
        publicSignals,
        proof
    )
    return { isValid, proof, publicSignals }
}

export { genEpochKeyCircuitInput, genReputationCircuitInput, genProofAndVerify }
