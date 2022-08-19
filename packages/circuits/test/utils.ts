// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import assert from 'assert'
import { ethers } from 'ethers'
import * as circom from 'circom'
import * as crypto from '@unirep/crypto'

import {
    executeCircuit,
    Circuit,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    USER_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_ATTESTATIONS_PER_PROOF,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../src'
import { defaultProver } from '../provers/defaultProver'
import { expect } from 'chai'

const SMT_ZERO_LEAF = crypto.hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = crypto.hashLeftRight(BigInt(1), BigInt(0))
const EPOCH_KEY_NULLIFIER_DOMAIN = BigInt(1)

type UserStates = {
    userStateTree: crypto.SparseMerkleTree
    reputationRecords: { [key: string]: IReputation }
}

interface IAttestation {
    attesterId: BigInt
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
    signUp: BigInt
    hash: BigInt | string
}

class Attestation implements IAttestation {
    public attesterId: BigInt
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public signUp: BigInt

    constructor(
        _attesterId: BigInt,
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ) {
        this.attesterId = _attesterId
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.signUp = _signUp
    }

    get hash() {
        return crypto.hash5([
            this.attesterId,
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
        ])
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                attesterId: this.attesterId.toString(),
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                signUp: this.signUp.toString(),
            },
            null,
            space
        )
    }
}

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
            crypto.hashOne(_graffitiPreImage) === this.graffiti,
            'Graffiti pre-image does not match'
        )
        this.graffitiPreImage = _graffitiPreImage
    }

    public hash = (): BigInt => {
        return crypto.hash5([
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
            BigInt(0),
        ])
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                graffitiPreImage: this.graffitiPreImage.toString(),
                signUp: this.signUp.toString(),
            },
            null,
            space
        )
    }
}

const toCompleteHexString = (str: string, len?: number): string => {
    str = str.startsWith('0x') ? str : '0x' + str
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const genNewSMT = (treeDepth: number, defaultLeafHash: BigInt) => {
    return new crypto.SparseMerkleTree(treeDepth, defaultLeafHash)
}

const genNewEpochTree = (_epochTreeDepth: number = EPOCH_TREE_DEPTH) => {
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const defaultUserStateLeaf = crypto.hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new crypto.SparseMerkleTree(treeDepth, defaultUserStateLeaf)
    return t.root
}

const genNewUserStateTree = (
    _userStateTreeDepth: number = USER_STATE_TREE_DEPTH
) => {
    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

const genEpochKey = (
    identityNullifier: BigInt,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = EPOCH_TREE_DEPTH
): BigInt => {
    const epochKey = crypto
        .hash2([(identityNullifier as any) + BigInt(nonce), epoch])
        .valueOf()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
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

    const circuitInputs = {
        GST_path_elements: proof.siblings,
        GST_path_index: proof.pathIndices,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: ustRoot,
        nonce: nonce,
        epoch: epoch,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const bootstrapRandomUSTree = (): UserStates => {
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
        userStateTree.update(
            BigInt(attesterId),
            reputationRecords[attesterId.toString()].hash()
        )
    }
    return { userStateTree, reputationRecords }
}

const bootstrapAttestation = (): Attestation => {
    const attesterId = BigInt(Math.ceil(Math.random() * 10))
    const signUp = Math.floor(Math.random() * 2)
    const attestation = new Attestation(
        attesterId,
        BigInt(Math.floor(Math.random() * 100)),
        BigInt(Math.floor(Math.random() * 100)),
        BigInt(0),
        BigInt(signUp)
    )
    return attestation
}

const genProcessAttestationsCircuitInput = (
    id: crypto.ZkIdentity,
    epoch: number,
    fromNonce: number,
    toNonce: number,
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
    const hashChainStarter = _hashChainStarter ?? crypto.genRandomSalt()
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
        userStateTree.update(
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
        posReps.push(attestation['posRep'])
        negReps.push(attestation['negRep'])
        graffities.push(attestation['graffiti'])
        signUps.push(attestation['signUp'])
        overwriteGraffitis.push(BigInt(attestation['graffiti'] != BigInt(0)))
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
            const oldReputationRecordProof =
                userStateTree.createProof(attesterId)
            userStateTreePathElements.push(oldReputationRecordProof)

            // Update reputation record
            reputationRecords[attesterId.toString()].update(
                attestation['posRep'],
                attestation['negRep'],
                attestation['graffiti'],
                attestation['signUp']
            )

            userStateTree.update(
                attesterId,
                reputationRecords[attesterId.toString()].hash()
            )

            const attestation_hash = attestation.hash
            hashChainResult = crypto.hashLeftRight(
                attestation_hash,
                hashChainResult
            )
        } else {
            oldPosReps.push(BigInt(0))
            oldNegReps.push(BigInt(0))
            oldGraffities.push(BigInt(0))
            oldSignUps.push(BigInt(0))

            const leafZeroPathElements = userStateTree.createProof(BigInt(0))
            userStateTreePathElements.push(leafZeroPathElements)
        }

        intermediateUserStateTreeRoots.push(userStateTree.root)
    }
    const inputBlindedUserState = crypto.hash5([
        id.identityNullifier,
        intermediateUserStateTreeRoots[0],
        epoch,
        fromNonce,
        BigInt(0),
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

const genStartTransitionCircuitInput = (
    id: crypto.ZkIdentity,
    epoch: number,
    nonce: number,
    userStateTreeRoot: BigInt,
    GSTreeProof: any
) => {
    // Circuit inputs
    const circuitInputs = crypto.stringifyBigInts({
        epoch,
        nonce,
        user_tree_root: userStateTreeRoot,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        GST_path_elements: GSTreeProof.siblings,
        GST_path_index: GSTreeProof.pathIndices,
    })

    // Circuit outputs
    // blinded user state and blinded hash chain are the inputs of processAttestationProofs
    const blindedUserState = crypto.hash5([
        id.identityNullifier,
        userStateTreeRoot,
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0),
    ])
    const blindedHashChain = crypto.hash5([
        id.identityNullifier,
        BigInt(0), // hashchain starter
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0),
    ])

    return {
        circuitInputs: circuitInputs,
        blindedUserState: blindedUserState,
        blindedHashChain: blindedHashChain,
    }
}

const genUserStateTransitionCircuitInput = (
    id: crypto.ZkIdentity,
    epoch: number,
    numAttestations: number = 0,
    {
        userStateTree,
        reputationRecords: initReputation,
    } = bootstrapRandomUSTree()
): {
    startTransitionCircuitInputs
    processAttestationCircuitInputs
    finalTransitionCircuitInputs
    attestationsMap
} => {
    // don't need to check sign up because we won't be able to create a
    // gstree proof unless we are signed up
    // this._checkUserSignUp()
    const fromEpoch = epoch
    const leafIndex = 0
    const fromNonce = 0

    // User state tree
    const fromEpochUserStateTree: crypto.SparseMerkleTree = userStateTree
    const intermediateUserStateTreeRoots: BigInt[] = [
        fromEpochUserStateTree.root,
    ]
    const userStateLeafPathElements: any[] = []
    // GSTree
    const fromEpochGSTree = new crypto.IncrementalMerkleTree(
        GLOBAL_STATE_TREE_DEPTH
    )
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = crypto.hashLeftRight(
        commitment,
        fromEpochUserStateTree.root
    )
    fromEpochGSTree.insert(hashedLeaf)
    const GSTreeProof = fromEpochGSTree.createProof(leafIndex)
    // Epoch tree
    const fromEpochTree = genNewEpochTree()
    // bootstrap attestations and epoch tree
    const attestationsMap = {}
    const hashChains = {}
    for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
        const epochKey = genEpochKey(
            id.identityNullifier,
            fromEpoch,
            nonce,
            EPOCH_TREE_DEPTH
        ).toString()

        attestationsMap[epochKey] = Array(
            Math.floor(numAttestations ?? Math.random() * 10)
        ).fill(bootstrapAttestation())

        for (const a of attestationsMap[epochKey]) {
            if (hashChains[epochKey] === undefined)
                hashChains[epochKey] = BigInt(0)
            hashChains[epochKey] = crypto.hashLeftRight(
                a.hash,
                hashChains[epochKey]
            )
        }
    }

    for (const key in hashChains) {
        if (hashChains[key] === undefined) hashChains[key] = BigInt(0)
        const sealedHashChain = crypto.hashLeftRight(1, hashChains[key])
        fromEpochTree.update(BigInt(key), sealedHashChain)
    }

    const epochTreeRoot = fromEpochTree.root
    const epochKeyPathElements: any[] = []

    // start transition proof
    const {
        circuitInputs: startTransitionCircuitInputs,
        blindedUserState: startTransitionBlindedUserState,
    } = genStartTransitionCircuitInput(
        id,
        epoch,
        fromNonce,
        fromEpochUserStateTree.root,
        GSTreeProof
    )

    // process attestation proof
    const processAttestationCircuitInputs: any[] = []
    const fromNonces: number[] = [fromNonce]
    const toNonces: number[] = []
    const hashChainStarter: BigInt[] = []
    const blindedUserState: BigInt[] = [startTransitionBlindedUserState]
    const blindedHashChain: BigInt[] = []
    let reputationRecords = {}
    const selectors: number[] = []
    const attesterIds: string[] = []
    const oldPosReps: string[] = [],
        oldNegReps: string[] = [],
        oldGraffities: string[] = [],
        oldSignUps: string[] = []
    const posReps: string[] = [],
        negReps: string[] = [],
        graffities: string[] = [],
        overwriteGraffities: any[] = [],
        signUps: string[] = []
    const finalBlindedUserState: BigInt[] = []
    const finalUserState: BigInt[] = [intermediateUserStateTreeRoots[0]]
    const finalHashChain: BigInt[] = []
    for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
        const epochKey = genEpochKey(
            id.identityNullifier,
            fromEpoch,
            nonce,
            EPOCH_TREE_DEPTH
        )
        let currentHashChain: BigInt = BigInt(0)

        // Blinded user state and hash chain of the epoch key
        toNonces.push(nonce)
        hashChainStarter.push(currentHashChain)

        // Attestations
        const attestations: Attestation[] = attestationsMap[epochKey.toString()]

        // TODO: update attestation types
        for (let i = 0; i < attestations.length; i++) {
            // Include a blinded user state and blinded hash chain per proof
            if (
                i &&
                i % NUM_ATTESTATIONS_PER_PROOF == 0 &&
                i != NUM_ATTESTATIONS_PER_PROOF - 1
            ) {
                toNonces.push(nonce)
                fromNonces.push(nonce)
                hashChainStarter.push(currentHashChain)
                blindedUserState.push(
                    crypto.hash5([
                        id.identityNullifier,
                        fromEpochUserStateTree.root,
                        BigInt(fromEpoch),
                        BigInt(nonce),
                        BigInt(0),
                    ])
                )
            }

            const attestation = new Attestation(
                attestations[i].attesterId,
                attestations[i].posRep,
                attestations[i].negRep,
                attestations[i].graffiti,
                attestations[i].signUp
            )
            const attesterId: BigInt = BigInt(attestation.attesterId.toString())
            const rep =
                initReputation[attesterId.toString()] ?? Reputation.default()

            if (reputationRecords[attesterId.toString()] === undefined) {
                reputationRecords[attesterId.toString()] = new Reputation(
                    rep.posRep,
                    rep.negRep,
                    rep.graffiti,
                    rep.signUp
                )
            }

            oldPosReps.push(reputationRecords[attesterId.toString()].posRep)
            oldNegReps.push(reputationRecords[attesterId.toString()].negRep)
            oldGraffities.push(
                reputationRecords[attesterId.toString()].graffiti
            )
            oldSignUps.push(reputationRecords[attesterId.toString()].signUp)

            // Add UST merkle proof to the list
            const USTLeafPathElements =
                fromEpochUserStateTree.createProof(attesterId)
            userStateLeafPathElements.push(USTLeafPathElements)

            // Update attestation record
            reputationRecords[attesterId.toString()].update(
                attestation.posRep,
                attestation.negRep,
                attestation.graffiti,
                attestation.signUp
            )

            // Update UST
            fromEpochUserStateTree.update(
                attesterId,
                reputationRecords[attesterId.toString()].hash()
            )
            // Add new UST root to intermediate UST roots
            intermediateUserStateTreeRoots.push(fromEpochUserStateTree.root)

            selectors.push(1)
            attesterIds.push(attesterId.toString())
            posReps.push(attestation.posRep.toString())
            negReps.push(attestation.negRep.toString())
            graffities.push(attestation.graffiti.toString())
            overwriteGraffities.push(attestation.graffiti.toString() != '0')
            signUps.push(attestation.signUp.toString())

            // Update current hashchain result
            currentHashChain = crypto.hashLeftRight(
                attestation.hash,
                currentHashChain
            )
        }
        // Fill in blank data for non-exist attestation
        const filledAttestationNum = attestations.length
            ? Math.ceil(attestations.length / NUM_ATTESTATIONS_PER_PROOF) *
              NUM_ATTESTATIONS_PER_PROOF
            : NUM_ATTESTATIONS_PER_PROOF
        for (let i = 0; i < filledAttestationNum - attestations.length; i++) {
            oldPosReps.push('0')
            oldNegReps.push('0')
            oldGraffities.push('0')
            oldSignUps.push('0')

            const USTLeafZeroPathElements = fromEpochUserStateTree.createProof(
                BigInt(0)
            )
            userStateLeafPathElements.push(USTLeafZeroPathElements)
            intermediateUserStateTreeRoots.push(fromEpochUserStateTree.root)

            selectors.push(0)
            attesterIds.push('0')
            posReps.push('0')
            negReps.push('0')
            graffities.push('0')
            overwriteGraffities.push('0')
            signUps.push('0')
        }
        epochKeyPathElements.push(fromEpochTree.createProof(epochKey))
        finalHashChain.push(currentHashChain)
        blindedUserState.push(
            crypto.hash5([
                id.identityNullifier,
                fromEpochUserStateTree.root,
                BigInt(fromEpoch),
                BigInt(nonce),
                BigInt(0),
            ])
        )
        blindedHashChain.push(
            crypto.hash5([
                id.identityNullifier,
                currentHashChain,
                BigInt(fromEpoch),
                BigInt(nonce),
                BigInt(0),
            ])
        )
        if (nonce != NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1) fromNonces.push(nonce)
    }

    for (let i = 0; i < fromNonces.length; i++) {
        const startIdx = NUM_ATTESTATIONS_PER_PROOF * i
        const endIdx = NUM_ATTESTATIONS_PER_PROOF * (i + 1)
        processAttestationCircuitInputs.push(
            crypto.stringifyBigInts({
                epoch: fromEpoch,
                from_nonce: fromNonces[i],
                to_nonce: toNonces[i],
                identity_nullifier: id.identityNullifier,
                intermediate_user_state_tree_roots:
                    intermediateUserStateTreeRoots.slice(startIdx, endIdx + 1),
                old_pos_reps: oldPosReps.slice(startIdx, endIdx),
                old_neg_reps: oldNegReps.slice(startIdx, endIdx),
                old_graffities: oldGraffities.slice(startIdx, endIdx),
                old_sign_ups: oldSignUps.slice(startIdx, endIdx),
                path_elements: userStateLeafPathElements.slice(
                    startIdx,
                    endIdx
                ),
                attester_ids: attesterIds.slice(startIdx, endIdx),
                pos_reps: posReps.slice(startIdx, endIdx),
                neg_reps: negReps.slice(startIdx, endIdx),
                graffities: graffities.slice(startIdx, endIdx),
                overwrite_graffities: overwriteGraffities.slice(
                    startIdx,
                    endIdx
                ),
                sign_ups: signUps.slice(startIdx, endIdx),
                selectors: selectors.slice(startIdx, endIdx),
                hash_chain_starter: hashChainStarter[i],
                input_blinded_user_state: blindedUserState[i],
            })
        )
    }

    // final user state transition proof
    const startEpochKeyNonce = 0
    const endEpochKeyNonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1
    finalUserState.push(fromEpochUserStateTree.root)
    finalBlindedUserState.push(
        crypto.hash5([
            id.identityNullifier,
            finalUserState[0],
            BigInt(fromEpoch),
            BigInt(startEpochKeyNonce),
            BigInt(0),
        ])
    )
    finalBlindedUserState.push(
        crypto.hash5([
            id.identityNullifier,
            finalUserState[1],
            BigInt(fromEpoch),
            BigInt(endEpochKeyNonce),
            BigInt(0),
        ])
    )
    const finalTransitionCircuitInputs = crypto.stringifyBigInts({
        epoch: fromEpoch,
        blinded_user_state: finalBlindedUserState,
        intermediate_user_state_tree_roots: finalUserState,
        start_epoch_key_nonce: startEpochKeyNonce,
        end_epoch_key_nonce: endEpochKeyNonce,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        GST_path_elements: GSTreeProof.siblings,
        GST_path_index: GSTreeProof.pathIndices,
        epk_path_elements: epochKeyPathElements,
        hash_chain_results: finalHashChain,
        blinded_hash_chain_results: blindedHashChain,
        epoch_tree_root: epochTreeRoot,
    })

    return {
        startTransitionCircuitInputs,
        processAttestationCircuitInputs,
        finalTransitionCircuitInputs,
        attestationsMap,
    }
}

const genReputationCircuitInput = (
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
    const repNullifiersAmount = _repNullifiersAmount ?? 0
    const minRep = _minRep ?? 0
    const proveGraffiti = _proveGraffiti ?? 0
    let graffitiPreImage
    if (proveGraffiti === 1 && reputationRecords[attesterId]) {
        graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage']
    }
    graffitiPreImage = _graffitiPreImage ?? 0
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = crypto.hashLeftRight(commitment, userStateRoot)
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
        // epoch_key: epk,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        // GST_root: GSTreeRoot,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId]['posRep'],
        neg_rep: reputationRecords[attesterId]['negRep'],
        graffiti: reputationRecords[attesterId]['graffiti'],
        sign_up: reputationRecords[attesterId]['signUp'],
        UST_path_elements: USTPathElements,
        rep_nullifiers_amount: repNullifiersAmount,
        start_rep_nonce: nonceStarter,
        min_rep: minRep,
        prove_graffiti: proveGraffiti,
        graffiti_pre_image: graffitiPreImage,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genProveSignUpCircuitInput = (
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
        userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = crypto.hashLeftRight(commitment, userStateRoot)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    const circuitInputs = {
        epoch: epoch,
        // epoch_key: epk,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        // GST_root: GSTreeRoot,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId]['posRep'],
        neg_rep: reputationRecords[attesterId]['negRep'],
        graffiti: reputationRecords[attesterId]['graffiti'],
        sign_up: reputationRecords[attesterId]['signUp'],
        UST_path_elements: USTPathElements,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genProofAndVerify = async (circuit: Circuit, circuitInputs) => {
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
    return isValid
}

const genEpochKeyNullifier = (
    identityNullifier: BigInt,
    epoch: number,
    nonce: number
): BigInt => {
    return crypto.hash2([
        BigInt(epoch),
        (identityNullifier as any) + BigInt(nonce),
    ])
}

/*
 * @param circuitPath The subpath to the circuit file (e.g.
 *     test/userStateTransition_test.circom)
 */
const compileAndLoadCircuit = async (circuitPath: string) => {
    const circuit = await circom.tester(circuitPath)

    await circuit.loadSymbols()

    return circuit
}

const throwError = async (
    circuit: any,
    circuitInputs: any,
    errorMsg: string
) => {
    let error
    try {
        await executeCircuit(circuit, circuitInputs)
    } catch (e) {
        error = e
        expect(true).to.be.true
    } finally {
        if (!error) throw Error(errorMsg)
    }
}

export {
    Attestation,
    Reputation,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    toCompleteHexString,
    genEpochKey,
    bootstrapRandomUSTree,
    genEpochKeyCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    genEpochKeyNullifier,
    genProofAndVerify,
    compileAndLoadCircuit,
    throwError,
}
