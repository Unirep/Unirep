// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import assert from 'assert'
import { ethers, BigNumberish } from 'ethers'
import Keyv from 'keyv'
import * as crypto from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    genProofAndPublicSignals,
    verifyProof,
} from '@unirep/circuits'
import {
    Attestation as _Attestation,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
} from '../src'
import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_ATTESTATIONS_PER_PROOF,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    USER_STATE_TREE_DEPTH,
} from '@unirep/circuits/config'
import { SparseMerkleTree } from '@unirep/crypto'

import {
    hashLeftRight,
    hash5,
    hashOne,
    poseidon,
} from '../../circuits/test/utils'

const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))
const EPOCH_KEY_NULLIFIER_DOMAIN = BigInt(1)
const GSTZERO_VALUE = 0

export type Field = BigNumberish

interface IReputation {
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
    signUp: BigInt
}

class Reputation implements IReputation {
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public graffitiPreImage: BigInt = BigInt(0)
    public signUp: BigInt

    constructor(
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ) {
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.signUp = _signUp
    }

    public static default(): Reputation {
        return new Reputation(BigInt(0), BigInt(0), BigInt(0), BigInt(0))
    }

    public update = (
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ): Reputation => {
        this.posRep = BigInt(Number(this.posRep) + Number(_posRep))
        this.negRep = BigInt(Number(this.negRep) + Number(_negRep))
        if (_graffiti != BigInt(0)) {
            this.graffiti = _graffiti
        }
        this.signUp = this.signUp || _signUp
        return this
    }

    public addGraffitiPreImage = (_graffitiPreImage: BigInt) => {
        assert(
            hashOne(_graffitiPreImage) === this.graffiti,
            'Graffiti pre-image does not match'
        )
        this.graffitiPreImage = _graffitiPreImage
    }

    public hash = (): BigInt => {
        return hash5([
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
            BigInt(0),
        ])
    }
}

class Attestation extends _Attestation {
    constructor(
        _attesterId: BigInt | BigNumberish,
        _posRep: BigInt | BigNumberish,
        _negRep: BigInt | BigNumberish,
        _graffiti: BigInt | BigNumberish,
        _signUp: BigInt | BigNumberish
    ) {
        super(
            poseidon,
            _attesterId,
            _posRep,
            _negRep,
            _graffiti,
            _signUp
        )
    }
}

const toCompleteHexString = (str: string, len?: number): string => {
    str = str.startsWith('0x') ? str : '0x' + str
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const genNewSMT = (treeDepth: number, defaultLeafHash: BigInt) => {
    return new SparseMerkleTree(
        poseidon,
        new Keyv(),
        treeDepth,
        defaultLeafHash
    )
}

const genNewEpochTree = (_epochTreeDepth: number = EPOCH_TREE_DEPTH) => {
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const defaultUserStateLeaf = hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new SparseMerkleTree(
        poseidon,
        new Keyv(),
        treeDepth,
        defaultUserStateLeaf
    )

    return t.root
}
const defaultGSTLeaf = (treeDepth: number): BigInt => {
    const USTRoot = computeEmptyUserStateRoot(treeDepth)
    return hashLeftRight(BigInt(0), USTRoot)
}

const genNewUserStateTree = (
    userStateTreeDepth: number = USER_STATE_TREE_DEPTH
): crypto.SparseMerkleTree => {
    return genNewSMT(userStateTreeDepth, defaultUserStateLeaf)
}

const genEpochKey = (
    identityNullifier: crypto.SnarkBigInt,
    epoch: BigNumberish,
    nonce: BigNumberish,
    epochTreeDepth: number = EPOCH_TREE_DEPTH
): crypto.SnarkBigInt => {
    const values: any[] = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ]
    let epochKey = hash5(values).toString()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyNullifier = (
    identityNullifier: crypto.SnarkBigInt,
    epoch: number,
    nonce: number
): crypto.SnarkBigInt => {
    return hash5([
        EPOCH_KEY_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0),
    ])
}

const bootstrapRandomUSTree = async (): Promise<any> => {
    const expectedNumAttestationsMade = 5
    const userStateTree = genNewUserStateTree()
    let reputationRecords = {}
    // Bootstrap user state for the first `expectedNumAttestationsMade` attesters
    for (let i = 1; i < expectedNumAttestationsMade; i++) {
        const attesterId = BigInt(
            Math.ceil(Math.random() * (2 ** USER_STATE_TREE_DEPTH - 1))
        )
        if (reputationRecords[attesterId.toString()] === undefined) {
            const signUp = Math.floor(Math.random() * 2)
            reputationRecords[attesterId.toString()] = new Reputation(
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                crypto.genRandomSalt(),
                BigInt(signUp)
            )
        }
        await userStateTree.update(
            BigInt(attesterId),
            reputationRecords[attesterId.toString()].hash()
        )
    }
    return { userStateTree, reputationRecords }
}

const genEpochKeyCircuitInput = (
    id: crypto.ZkIdentity,
    tree: crypto.IncrementalMerkleTree,
    leafIndex: number,
    ustRoot: BigInt,
    epoch: number,
    nonce: number
) => {
    const proof = tree.createProof(leafIndex)
    const root = tree.root
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)

    const circuitInputs = {
        GST_path_elements: proof.siblings,
        GST_path_index: proof.pathIndices,
        GST_root: root,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: ustRoot,
        nonce: nonce,
        epoch: epoch,
        epoch_key: epk,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genStartTransitionCircuitInput = (
    id: crypto.ZkIdentity,
    tree: crypto.IncrementalMerkleTree,
    leafIndex: number,
    ustRoot: BigInt,
    epoch: number,
    nonce: number
) => {
    const proof = tree.createProof(leafIndex)
    const root = tree.root

    const circuitInputs = {
        epoch: epoch,
        nonce: nonce,
        user_tree_root: ustRoot,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        GST_path_elements: proof.siblings,
        GST_path_index: proof.pathIndices,
        GST_root: root,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genProcessAttestationsCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: BigInt,
    fromNonce: BigInt,
    toNonce: BigInt,
    _selectors?: number[],
    _hashChainStarter?: BigInt,
    _attestations?: Attestation[]
) => {
    const oldPosReps: BigInt[] = []
    const oldNegReps: BigInt[] = []
    const oldGraffities: BigInt[] = []
    const oldSignUps: BigInt[] = []
    const attesterIds: BigInt[] = []
    const posReps: BigInt[] = []
    const negReps: BigInt[] = []
    const overwriteGraffitis: BigInt[] = []
    const graffities: BigInt[] = []
    const signUps: BigInt[] = []
    let selectors: number[] = []
    const hashChainStarter =
        _hashChainStarter === undefined
            ? crypto.genRandomSalt()
            : _hashChainStarter
    const intermediateUserStateTreeRoots: BigInt[] = []
    const userStateTreePathElements: BigInt[][] = []

    const userStateTree = genNewUserStateTree()
    let reputationRecords = {}

    // Bootstrap user state
    for (let i = 0; i < NUM_ATTESTATIONS_PER_PROOF; i++) {
        // attester ID cannot be 0
        const attesterId = BigInt(
            Math.ceil(Math.random() * (2 ** USER_STATE_TREE_DEPTH - 1))
        )
        if (reputationRecords[attesterId.toString()] === undefined) {
            const signUp = Math.floor(Math.random() * 2)
            reputationRecords[attesterId.toString()] = new Reputation(
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                crypto.genRandomSalt(),
                BigInt(signUp)
            )
        }
        await userStateTree.update(
            attesterId,
            reputationRecords[attesterId.toString()].hash()
        )
    }
    intermediateUserStateTreeRoots.push(userStateTree.root)

    // Ensure as least one of the selectors is true
    const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS_PER_PROOF)
    for (let i = 0; i < NUM_ATTESTATIONS_PER_PROOF; i++) {
        if (i == selTrue) selectors.push(1)
        else selectors.push(Math.floor(Math.random() * 2))
    }
    if (_selectors !== undefined) selectors = _selectors

    let hashChainResult = hashChainStarter
    for (let i = 0; i < NUM_ATTESTATIONS_PER_PROOF; i++) {
        let attesterId
        let attestation: Attestation
        if (_attestations === undefined) {
            // attester ID cannot be 0
            attesterId = BigInt(
                Math.ceil(Math.random() * (2 ** USER_STATE_TREE_DEPTH - 1))
            )
            const signUp = Math.floor(Math.random() * 2)
            attestation = new Attestation(
                attesterId,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(0),
                BigInt(signUp)
            )
        } else {
            attesterId = _attestations[i].attesterId
            attestation = _attestations[i]
        }

        attesterIds.push(attesterId)
        posReps.push(attestation['posRep'].toBigInt())
        negReps.push(attestation['negRep'].toBigInt())
        graffities.push(attestation['graffiti'].toBigInt())
        signUps.push(attestation['signUp'].toBigInt())
        overwriteGraffitis.push(
            BigInt(attestation['graffiti'].toBigInt() != BigInt(0))
        )
        if (reputationRecords[attesterId.toString()] === undefined) {
            reputationRecords[attesterId.toString()] = Reputation.default()
        }

        if (selectors[i] == 1) {
            oldPosReps.push(reputationRecords[attesterId.toString()]['posRep'])
            oldNegReps.push(reputationRecords[attesterId.toString()]['negRep'])
            oldGraffities.push(
                reputationRecords[attesterId.toString()]['graffiti']
            )
            oldSignUps.push(reputationRecords[attesterId.toString()]['signUp'])

            // Get old reputation record proof
            const oldReputationRecordProof = await userStateTree.createProof(
                attesterId
            )
            userStateTreePathElements.push(oldReputationRecordProof)

            // Update reputation record
            reputationRecords[attesterId.toString()].update(
                attestation['posRep'],
                attestation['negRep'],
                attestation['graffiti'],
                attestation['signUp']
            )

            await userStateTree.update(
                attesterId,
                reputationRecords[attesterId.toString()].hash()
            )

            const attestation_hash = attestation.hash()
            hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
        } else {
            oldPosReps.push(BigInt(0))
            oldNegReps.push(BigInt(0))
            oldGraffities.push(BigInt(0))
            oldSignUps.push(BigInt(0))

            const leafZeroPathElements = await userStateTree.createProof(
                BigInt(0)
            )
            userStateTreePathElements.push(leafZeroPathElements)
        }

        intermediateUserStateTreeRoots.push(userStateTree.root)
    }
    const inputBlindedUserState = hash5([
        id.identityNullifier,
        intermediateUserStateTreeRoots[0],
        epoch,
        fromNonce,
    ])

    const circuitInputs = {
        epoch: epoch,
        from_nonce: fromNonce,
        to_nonce: toNonce,
        identity_nullifier: id.identityNullifier,
        intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
        old_pos_reps: oldPosReps,
        old_neg_reps: oldNegReps,
        old_graffities: oldGraffities,
        old_sign_ups: oldSignUps,
        path_elements: userStateTreePathElements,
        attester_ids: attesterIds,
        pos_reps: posReps,
        neg_reps: negReps,
        graffities: graffities,
        overwrite_graffities: overwriteGraffitis,
        sign_ups: signUps,
        selectors: selectors,
        hash_chain_starter: hashChainStarter,
        input_blinded_user_state: inputBlindedUserState,
    }
    return {
        circuitInputs: crypto.stringifyBigInts(circuitInputs),
        hashChainResult: hashChainResult,
    }
}

const genUserStateTransitionCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: number
) => {
    // config
    const startEpochKeyNonce = Math.floor(
        Math.random() * NUM_EPOCH_KEY_NONCE_PER_EPOCH
    )
    const endEpochKeyNonce =
        (startEpochKeyNonce + NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1) %
        NUM_EPOCH_KEY_NONCE_PER_EPOCH

    // Epoch tree
    const epochTree = await genNewEpochTree()

    // User state tree
    const { userStateTree } = await bootstrapRandomUSTree()
    const intermediateUserStateTreeRoots: BigInt[] = []
    const blindedUserState: BigInt[] = []
    const blindedHashChain: BigInt[] = []
    const epochTreePathElements: BigInt[][] = []

    intermediateUserStateTreeRoots.push(userStateTree.root)
    blindedUserState.push(
        hash5([
            id.identityNullifier,
            userStateTree.root,
            BigInt(epoch),
            BigInt(startEpochKeyNonce),
        ])
    )

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(
        poseidon,
        GLOBAL_STATE_TREE_DEPTH
    )
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = hashLeftRight(commitment, userStateTree.root)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0)
    const GSTreeRoot = GSTree.root

    const hashChainResults: BigInt[] = []
    // Begin generating and processing attestations
    for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
        // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
        // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
        const epochKey = genEpochKey(
            id.identityNullifier,
            epoch,
            nonce,
            EPOCH_TREE_DEPTH
        )
        const hashChainResult = crypto.genRandomSalt()

        // Blinded hash chain result
        hashChainResults.push(hashChainResult)
        blindedHashChain.push(
            hash5([
                id.identityNullifier,
                hashChainResult,
                BigInt(epoch),
                BigInt(nonce),
            ])
        )

        // Seal hash chain of this epoch key
        const sealedHashChainResult = hashLeftRight(BigInt(1), hashChainResult)

        // Update epoch tree
        await epochTree.update(epochKey, sealedHashChainResult)
    }

    const intermediateUserStateTreeRoot = crypto.genRandomSalt()
    intermediateUserStateTreeRoots.push(intermediateUserStateTreeRoot)
    blindedUserState.push(
        hash5([
            id.identityNullifier,
            intermediateUserStateTreeRoot,
            BigInt(epoch),
            BigInt(endEpochKeyNonce),
        ])
    )

    for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
        const epochKey = genEpochKey(
            id.identityNullifier,
            epoch,
            nonce,
            EPOCH_TREE_DEPTH
        )
        // Get epoch tree root and merkle proof for this epoch key
        epochTreePathElements.push(await epochTree.createProof(epochKey))
    }
    const epochTreeRoot = epochTree.root

    const circuitInputs = {
        epoch: epoch,
        blinded_user_state: blindedUserState,
        intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
        start_epoch_key_nonce: startEpochKeyNonce,
        end_epoch_key_nonce: endEpochKeyNonce,

        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        GST_path_elements: GSTreeProof.siblings,
        GST_path_index: GSTreeProof.pathIndices,
        GST_root: GSTreeRoot,
        epk_path_elements: epochTreePathElements,
        hash_chain_results: hashChainResults,
        blinded_hash_chain_results: blindedHashChain,
        epoch_tree_root: epochTreeRoot,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genReputationCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: number,
    nonce: number,
    reputationRecords,
    attesterId,
    _repNullifiersAmount?,
    _minRep?,
    _proveGraffiti?,
    _graffitiPreImage?
) => {
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)
    const repNullifiersAmount =
        _repNullifiersAmount === undefined ? 0 : _repNullifiersAmount
    const minRep = _minRep === undefined ? 0 : _minRep
    const proveGraffiti = _proveGraffiti === undefined ? 0 : _proveGraffiti
    let graffitiPreImage
    if (proveGraffiti === 1 && reputationRecords[attesterId] !== undefined) {
        graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage']
    }
    graffitiPreImage = graffitiPreImage === undefined ? 0 : graffitiPreImage
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = await userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(
        poseidon,
        GLOBAL_STATE_TREE_DEPTH
    )
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = hashLeftRight(commitment, userStateRoot)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    // selectors and karma nonce
    const nonceStarter = 0
    const selectors: BigInt[] = []
    const nonceList: BigInt[] = []
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push(BigInt(nonceStarter + i))
        selectors.push(BigInt(1))
    }
    for (let i = repNullifiersAmount; i < MAX_REPUTATION_BUDGET; i++) {
        nonceList.push(BigInt(0))
        selectors.push(BigInt(0))
    }

    const circuitInputs = {
        epoch: epoch,
        epoch_key_nonce: nonce,
        epoch_key: epk,

        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        GST_root: GSTreeRoot,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId]['posRep'],
        neg_rep: reputationRecords[attesterId]['negRep'],
        graffiti: reputationRecords[attesterId]['graffiti'],
        sign_up: reputationRecords[attesterId]['signUp'],
        UST_path_elements: USTPathElements,
        rep_nullifiers_amount: repNullifiersAmount,
        selectors: selectors,
        rep_nonce: nonceList,
        min_rep: minRep,
        prove_graffiti: proveGraffiti,
        graffiti_pre_image: graffitiPreImage,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genProveSignUpCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: number,
    reputationRecords,
    attesterId,
    _signUp?: number
) => {
    const nonce = 0
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = await userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(
        poseidon,
        GLOBAL_STATE_TREE_DEPTH
    )
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = hashLeftRight(commitment, userStateRoot)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    const circuitInputs = {
        epoch: epoch,
        epoch_key: epk,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        GST_root: GSTreeRoot,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId]['posRep'],
        neg_rep: reputationRecords[attesterId]['negRep'],
        graffiti: reputationRecords[attesterId]['graffiti'],
        sign_up: reputationRecords[attesterId]['signUp'],
        UST_path_elements: USTPathElements,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const formatProofAndPublicSignals = (
    circuit: Circuit,
    proof: crypto.SnarkProof,
    publicSignals: any[]
) => {
    let result
    const formattedProof: any[] = formatProofForVerifierContract(proof)
    if (circuit === Circuit.proveReputation) {
        result = new ReputationProof(publicSignals, proof)
    } else if (circuit === Circuit.verifyEpochKey) {
        result = new EpochKeyProof(publicSignals, proof)
    } else if (circuit === Circuit.proveUserSignUp) {
        result = new SignUpProof(publicSignals, proof)
    } else if (circuit === Circuit.startTransition) {
        result = {
            blindedUserState: publicSignals[0],
            blindedHashChain: publicSignals[1],
            GSTRoot: publicSignals[2],
            proof: formattedProof,
        }
    } else if (circuit === Circuit.processAttestations) {
        result = {
            outputBlindedUserState: publicSignals[0],
            outputBlindedHashChain: publicSignals[1],
            inputBlindedUserState: publicSignals[2],
            proof: formattedProof,
        }
    } else if (circuit === Circuit.userStateTransition) {
        result = new UserTransitionProof(publicSignals, proof)
    } else {
        result = publicSignals.concat([formattedProof])
    }
    return result
}

const genProofAndVerify = async (circuit: Circuit, circuitInputs) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } = await genProofAndPublicSignals(
        circuit,
        circuitInputs
    )
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )
    const isValid = await verifyProof(circuit, proof, publicSignals)
    return isValid
}

const genInputForContract = async (circuit: Circuit, circuitInputs) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } = await genProofAndPublicSignals(
        circuit,
        circuitInputs
    )
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )

    const input = formatProofAndPublicSignals(circuit, proof, publicSignals)
    return input
}

export {
    hashOne,
    hashLeftRight,
    poseidon,
    Attestation,
    Reputation,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    GSTZERO_VALUE,
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    defaultGSTLeaf,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    toCompleteHexString,
    genEpochKey,
    genEpochKeyNullifier,
    bootstrapRandomUSTree,
    genEpochKeyCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    formatProofAndPublicSignals,
    genProofAndVerify,
    genInputForContract,
}
