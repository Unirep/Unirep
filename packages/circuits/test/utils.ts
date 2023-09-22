import { Identity } from '@semaphore-protocol/identity'
import * as utils from '@unirep/utils'
import { poseidon1 } from 'poseidon-lite'

import { Circuit, SNARK_SCALAR_FIELD } from '../src'
import CircuitConfig from '../src/CircuitConfig'
import { defaultProver } from '../provers/defaultProver'
const {
    STATE_TREE_DEPTH,
    SUM_FIELD_COUNT,
    FIELD_COUNT,
    REPL_NONCE_BITS,
    MAX_SAFE_BITS,
} = CircuitConfig

export const randomData = () => [
    ...Array(SUM_FIELD_COUNT)
        .fill(0)
        .map(() => poseidon1([Math.floor(Math.random() * 199191919)])),
    ...Array(FIELD_COUNT - SUM_FIELD_COUNT)
        .fill(0)
        .map(
            () =>
                poseidon1([Math.floor(Math.random() * 199191919)]) %
                BigInt(2) ** MAX_SAFE_BITS
        ),
]

export const combineData = (data0, data1) => {
    const out = [] as bigint[]
    for (let x = 0; x < SUM_FIELD_COUNT; x++) {
        out.push(
            (BigInt(data0[x]) + BigInt(data1[x])) % BigInt(SNARK_SCALAR_FIELD)
        )
    }
    for (let x = SUM_FIELD_COUNT; x < FIELD_COUNT; x++) {
        const lower0 =
            data0[x] & (BigInt(2) ** BigInt(REPL_NONCE_BITS) - BigInt(1))
        const lower1 =
            data1[x] & (BigInt(2) ** BigInt(REPL_NONCE_BITS) - BigInt(1))
        out.push(BigInt(lower0) > BigInt(lower1) ? data0[x] : data1[x])
    }
    return out
}

const genEpochKeyCircuitInput = (config: {
    id: Identity
    tree: utils.IncrementalMerkleTree
    leafIndex: number
    epoch: number | bigint
    nonce: number | bigint
    attesterId: number | bigint
    data?: bigint[]
    sigData?: bigint
    revealNonce?: number | bigint
    chainId?: number | bigint
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
        chainId,
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
        state_tree_indeces: proof.pathIndices,
        identity_secret: id.secret,
        data,
        sig_data: sigData ?? BigInt(0),
        nonce,
        epoch,
        attester_id: attesterId,
        reveal_nonce: revealNonce ?? 0,
        chain_id: chainId ?? 0,
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
    graffiti?: any
    revealNonce?: number
    chainId: number
}) => {
    const {
        id,
        epoch,
        nonce,
        attesterId,
        startBalance: _startBalance,
        minRep,
        proveGraffiti,
        graffiti,
        maxRep,
        proveMinRep,
        proveMaxRep,
        proveZeroRep,
        revealNonce,
        chainId,
    } = Object.assign(
        {
            minRep: 0,
            maxRep: 0,
            graffiti: 0,
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
        startBalance as any,
        chainId ?? 0
    )
    stateTree.insert(hashedLeaf)
    const stateTreeProof = stateTree.createProof(0) // if there is only one GST leaf, the index is 0

    const circuitInputs = {
        identity_secret: id.secret,
        state_tree_indeces: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings,
        data: startBalance,
        graffiti: graffiti,
        epoch,
        nonce,
        attester_id: attesterId,
        prove_graffiti: proveGraffiti ? proveGraffiti : 0,
        min_rep: minRep,
        max_rep: maxRep,
        prove_max_rep: proveMaxRep ?? 0,
        prove_min_rep: proveMinRep ?? 0,
        prove_zero_rep: proveZeroRep ?? 0,
        reveal_nonce: revealNonce ?? 0,
        sig_data: 0,
        chain_id: chainId,
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

const genSignupCircuitInput = (config: {
    id: Identity
    epoch: number | bigint
    attesterId: number | bigint
    chainId: number | bigint
}) => {
    const { id, epoch, attesterId, chainId } = Object.assign(config)
    const circuitInputs = {
        identity_secret: id.secret,
        epoch,
        attester_id: attesterId,
        chain_id: chainId,
    }
    return utils.stringifyBigInts(circuitInputs)
}

const genPreventDoubleActionCircuitInput = (config: {
    id: Identity
    tree: utils.IncrementalMerkleTree
    leafIndex: number
    epoch: number | bigint
    nonce: number | bigint
    attesterId: number | bigint
    data?: bigint[]
    sigData?: bigint
    revealNonce?: number | bigint
    scope: bigint
    chainId: number | bigint
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
        scope,
        chainId,
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
        state_tree_indeces: proof.pathIndices,
        data,
        sig_data: sigData ?? BigInt(0),
        nonce,
        epoch,
        attester_id: attesterId,
        reveal_nonce: revealNonce ?? 0,
        identity_secret: id.secret,
        scope: scope,
        chain_id: chainId ?? 0,
    }

    return utils.stringifyBigInts(circuitInputs)
}

export {
    genEpochKeyCircuitInput,
    genSignupCircuitInput,
    genReputationCircuitInput,
    genProofAndVerify,
    genPreventDoubleActionCircuitInput,
}
