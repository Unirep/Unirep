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

const defaultEpochTreeLeaf = utils.hash4([0, 0, 0, 0])

const genNewEpochTree = (
    _epochTreeDepth: number = EPOCH_TREE_DEPTH,
    _epochTreeArity = EPOCH_TREE_ARITY
) => {
    return new utils.SparseMerkleTree(
        _epochTreeDepth,
        defaultEpochTreeLeaf,
        _epochTreeArity
    )
}

// TODO: needs to be updated
const genEpochKey = (
    identityNullifier: bigint,
    attesterId: number,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = EPOCH_TREE_DEPTH,
    _epochTreeArity: number = EPOCH_TREE_ARITY
): bigint => {
    const epochKey = utils.hash4([
        identityNullifier,
        BigInt(attesterId),
        epoch,
        nonce,
    ])
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed =
        epochKey % BigInt(_epochTreeArity) ** BigInt(_epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyCircuitInput = (config: {
    id: utils.ZkIdentity
    tree: utils.IncrementalMerkleTree
    leafIndex: number
    epoch: number
    nonce: number
    attesterId: number
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
    attesterId: number
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
    const epochTree = genNewEpochTree(EPOCH_TREE_DEPTH)
    for (const [key, val] of Object.entries(epochKeyBalances)) {
        const { posRep, negRep, graffiti, timestamp } = val
        epochTree.update(
            BigInt(key),
            utils.hash4([posRep, negRep, graffiti ?? 0, timestamp ?? 0])
        )
    }
    const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
        .fill(null)
        .map((_, i) =>
            genEpochKey(
                id.identityNullifier,
                attesterId,
                fromEpoch,
                i,
                EPOCH_TREE_DEPTH
            )
        )

    const stateTreeProof = tree.createProof(leafIndex)
    const circuitInputs = {
        from_epoch: fromEpoch,
        to_epoch: toEpoch,
        identity_nullifier: id.identityNullifier,
        state_tree_indexes: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings,
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
        epoch_tree_elements: epochKeys.map((k) => epochTree.createProof(k)),
        epoch_tree_root: epochTree.root,
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
    proveGraffiti?: boolean
    graffitiPreImage?: any
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
    } = Object.assign(
        {
            minRep: 0,
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
            maxRep: 0,
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

const genUserStateTransitionNullifier = (
    identityNullifier: bigint,
    epoch: number,
    attesterId: number
): bigint => {
    return utils.hash3([BigInt(attesterId), BigInt(epoch), identityNullifier])
}

export {
    defaultEpochTreeLeaf,
    genNewEpochTree,
    genEpochKey,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genUserStateTransitionCircuitInput,
    genUserStateTransitionNullifier,
    genProofAndVerify,
}
