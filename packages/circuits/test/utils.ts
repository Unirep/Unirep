import * as utils from '@unirep/utils'

import {
    Circuit,
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    ReputationProof,
    EpochKeyProof,
} from '../src'
import { defaultProver } from '../provers/defaultProver'
import { SNARK_SCALAR_FIELD } from '../config'

const genNewEpochTree = (
    _epochTreeDepth: number = EPOCH_TREE_DEPTH,
    _epochTreeArity = EPOCH_TREE_ARITY
) => {
    const tree = new utils.IncrementalMerkleTree(
        _epochTreeDepth,
        0,
        _epochTreeArity
    )
    tree.insert(0)
    return tree
}

const genEpochKeyCircuitInput = (config: {
    id: utils.ZkIdentity
    tree: utils.IncrementalMerkleTree
    leafIndex: number
    epoch: number
    nonce: number
    attesterId: number | bigint
    posRep: number
    negRep: number
    graffiti: number | bigint
    timestamp: number | bigint
    data?: bigint
    revealNonce?: number
}) => {
    const {
        id,
        tree,
        leafIndex,
        epoch,
        nonce,
        attesterId,
        posRep,
        negRep,
        graffiti,
        timestamp,
        data,
        revealNonce,
    } = config
    const proof = tree.createProof(leafIndex)
    const circuitInputs = {
        state_tree_elements: proof.siblings,
        state_tree_indexes: proof.pathIndices,
        identity_nullifier: id.identityNullifier,
        pos_rep: posRep,
        neg_rep: negRep,
        graffiti,
        timestamp,
        data: data ?? BigInt(0),
        control: EpochKeyProof.buildControlInput({
            nonce,
            epoch,
            attesterId,
            revealNonce,
        }),
    }
    return utils.stringifyBigInts(circuitInputs)
}

const genUserStateTransitionCircuitInput = (config: {
    id: utils.ZkIdentity
    fromEpoch: number
    toEpoch: number
    tree: utils.IncrementalMerkleTree
    leafIndex: number
    attesterId: number | bigint
    startBalance: { posRep: any; negRep: any; graffiti: any; timestamp: any }
    epochKeyBalances?: {
        [key: string]: {
            posRep: number
            negRep: number
            graffiti?: any
            timestamp?: any
        }
    }
}) => {
    const {
        id,
        fromEpoch,
        toEpoch,
        attesterId,
        startBalance,
        tree,
        leafIndex,
        epochKeyBalances,
    } = Object.assign(
        {
            epochKeyBalances: {},
        },
        config
    )
    const epochTree = genNewEpochTree()
    let index = 0
    const epochTreeIndices = {} as any
    for (const [key, val] of Object.entries(epochKeyBalances)) {
        const { posRep, negRep, graffiti, timestamp } = val
        epochTreeIndices[key] = ++index
        epochTree.insert(
            utils.hash5([key, posRep, negRep, graffiti ?? 0, timestamp ?? 0])
        )
    }
    epochTree.insert(BigInt(SNARK_SCALAR_FIELD) - BigInt(1))
    if (epochTree.leaves.length === 2) {
        // we don't
    }
    const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
        .fill(null)
        .map((_, i) =>
            utils.genEpochKey(
                id.identityNullifier,
                BigInt(attesterId),
                fromEpoch,
                i
            )
        )

    const epochKeyLeaves = epochKeys.map((k) =>
        utils.hash5([
            k,
            epochKeyBalances[k.toString()]?.posRep ?? BigInt(0),
            epochKeyBalances[k.toString()]?.negRep ?? BigInt(0),
            epochKeyBalances[k.toString()]?.graffiti ?? BigInt(0),
            epochKeyBalances[k.toString()]?.timestamp ?? BigInt(0),
        ])
    )
    const epochLeavesByKey = epochKeys.reduce((acc, epk) => {
        return {
            [epk.toString()]: utils.hash5([
                epk,
                epochKeyBalances[epk.toString()]?.posRep ?? BigInt(0),
                epochKeyBalances[epk.toString()]?.negRep ?? BigInt(0),
                epochKeyBalances[epk.toString()]?.graffiti ?? BigInt(0),
                epochKeyBalances[epk.toString()]?.timestamp ?? BigInt(0),
            ]),
            ...acc,
        }
    }, {})

    const stateTreeProof = tree._createProof(leafIndex)
    const circuitInputs = {
        from_epoch: fromEpoch,
        to_epoch: toEpoch,
        identity_nullifier: id.identityNullifier,
        state_tree_indexes: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings.map((s, i) => {
            return s[1 - stateTreeProof.pathIndices[i]]
        }),
        attester_id: attesterId,
        pos_rep: startBalance.posRep,
        neg_rep: startBalance.negRep,
        graffiti: startBalance.graffiti,
        timestamp: startBalance.timestamp,
        new_pos_rep: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.posRep ?? BigInt(0)
        ),
        new_neg_rep: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.negRep ?? BigInt(0)
        ),
        new_graffiti: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.graffiti ?? BigInt(0)
        ),
        new_timestamp: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.timestamp ?? BigInt(0)
        ),
        epoch_tree_elements: epochKeys.map((k) => {
            if (epochTreeIndices[k.toString()]) {
                const { siblings } = epochTree._createProof(
                    epochTreeIndices[k.toString()]
                )
                return siblings.slice(1)
            }
            const leaf = epochLeavesByKey[k.toString()]
            const index =
                epochTree.leaves.findIndex((l) => BigInt(l) > BigInt(leaf)) - 1
            const { siblings } = epochTree._createProof(index)
            return siblings.slice(1)
        }),
        epoch_tree_indices: epochKeys.map((k) => {
            if (epochTreeIndices[k.toString()]) {
                const { pathIndices } = epochTree._createProof(
                    epochTreeIndices[k.toString()]
                )
                return pathIndices.slice(1)
            }
            const leaf = epochLeavesByKey[k.toString()]
            const index =
                epochTree.leaves.findIndex((l) => BigInt(l) > BigInt(leaf)) - 1
            const { pathIndices } = epochTree._createProof(index)
            return pathIndices.slice(1)
        }),
        noninclusion_leaf: epochKeys.map((k) => {
            // find a leaf gt and lt
            if (epochTreeIndices[k.toString()]) return [0, 1]
            const leaf = epochLeavesByKey[k.toString()]
            const gtIndex = epochTree.leaves.findIndex(
                (l) => BigInt(l) > BigInt(leaf)
            )
            return [epochTree.leaves[gtIndex - 1], epochTree.leaves[gtIndex]]
        }),
        noninclusion_leaf_index: epochKeys.map((k) => {
            const leaf = epochLeavesByKey[k.toString()]
            return (
                epochTree.leaves.findIndex((l) => BigInt(l) > BigInt(leaf)) - 1
            )
        }),
        noninclusion_elements: epochKeys.map((k) => {
            const leaf = epochLeavesByKey[k.toString()]
            let gtIndex = epochTree.leaves.findIndex(
                (l) => BigInt(l) > BigInt(leaf)
            )
            if (gtIndex === -1) gtIndex = 1
            return [
                epochTree._createProof(gtIndex - 1).siblings[0],
                epochTree._createProof(gtIndex).siblings[0],
            ]
        }),
        inclusion_leaf_index: epochKeys.map((k) => {
            return epochTreeIndices[k.toString()] ?? 0
        }),
        inclusion_elements: epochKeys.map((k) => {
            const { siblings } = epochTree._createProof(
                epochTreeIndices[k.toString()] ?? 0
            )
            return siblings[0]
        }),
    }
    return utils.stringifyBigInts(circuitInputs)
}

const genReputationCircuitInput = (config: {
    id: utils.ZkIdentity
    epoch: number
    nonce: number
    attesterId: number
    startBalance: { posRep: any; negRep: any; graffiti?: any; timestamp?: any }
    minRep?: number
    maxRep?: number
    proveMinRep?: number
    proveMaxRep?: number
    proveZeroRep?: number
    proveGraffiti?: boolean
    graffitiPreImage?: any
    revealNonce?: number
}) => {
    const {
        id,
        epoch,
        nonce,
        attesterId,
        startBalance,
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
        },
        config
    )

    // Global state tree
    const stateTree = new utils.IncrementalMerkleTree(STATE_TREE_DEPTH)
    const hashedLeaf = utils.hash7([
        id.identityNullifier,
        attesterId,
        epoch,
        startBalance.posRep,
        startBalance.negRep,
        startBalance.graffiti ?? 0,
        startBalance.timestamp ?? 0,
    ])
    stateTree.insert(hashedLeaf)
    const stateTreeProof = stateTree.createProof(0) // if there is only one GST leaf, the index is 0

    const circuitInputs = {
        identity_nullifier: id.identityNullifier,
        state_tree_indexes: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings,
        pos_rep: startBalance.posRep,
        neg_rep: startBalance.negRep,
        graffiti: startBalance.graffiti ?? 0,
        timestamp: startBalance.timestamp ?? 0,
        graffiti_pre_image: graffitiPreImage,
        control: ReputationProof.buildControlInput({
            epoch,
            nonce,
            attesterId,
            proveGraffiti: proveGraffiti ? 1 : 0,
            minRep,
            maxRep,
            proveMaxRep,
            proveMinRep,
            proveZeroRep,
            revealNonce,
        }),
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

export {
    genNewEpochTree,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genUserStateTransitionCircuitInput,
    genProofAndVerify,
}
